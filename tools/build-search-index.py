#!/usr/bin/env python3
"""
Генератор индекса поиска. Запускается РУЧНО перед коммитом, на сайт не влияет:
сам сайт — обычные статические файлы, а этот скрипт нужен только потому, что по file://
страницы не могут читать друг друга, поэтому индекс должен лежать готовым файлом.

  python3 tools/build-search-index.py          — пересобрать assets/search-index.js и assets/site-data.js
  python3 tools/build-search-index.py --check  — проверить, что файлы актуальны (код выхода 1, если нет)

Используется только стандартная библиотека Python.
"""
import hashlib, json, re, sys
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PAGES = ['index.html', 'html.html', 'css.html', 'javascript.html', 'browsers.html']
CHAPTERS = ['chapters/browser-pipeline.html', 'chapters/layout-engine.html', 'chapters/html-parser.html']
CHAPTER_LABELS = {
    'chapters/browser-pipeline.html': 'Browser Pipeline',
    'chapters/layout-engine.html': 'Layout Engine',
    'chapters/html-parser.html': 'HTML Parser',
}
SKIP_TAGS = {'script', 'style', 'noscript', 'template'}


class Extractor(HTMLParser):
    """Идёт по странице и режет текст на записи по заголовкам h2 и h3."""

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.title = ''
        self.nav = {}
        self.entries = []          # [sectionId, sectionTitle, headingTitle, level, text]
        self.section_id = ''
        self.section_title = ''
        self.cur = None            # текущая запись
        self.stack = []            # стек открытых тегов (для пропуска поддеревьев)
        self.skip_depth = 0
        self.in_title = False
        self.heading = None        # (level, [chunks]) пока читаем заголовок
        self.in_main = False
        self.main_depth = 0
        self.href = None
        self.link_chunks = []

    def _start_entry(self, level, title):
        self.cur = [self.section_id, self.section_title or title, title, level, []]
        self.entries.append(self.cur)

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == 'title':
            self.in_title = True
        if tag == 'a' and any(m in ('topnav', 'bp-nav') for _, m, _ in self.stack):
            self.href = a.get('href')
            self.link_chunks = []
        void = tag in ('meta', 'link', 'br', 'img', 'input', 'hr', 'wbr')
        if not void:
            marker = ''
            if tag == 'nav' and any(name in (a.get('class') or '').split() for name in ('topnav', 'bp-nav')):
                marker = 'bp-nav' if 'bp-nav' in (a.get('class') or '').split() else 'topnav'
            if tag == 'main':
                self.in_main = True
                self.main_depth = len(self.stack)
            skip = tag in SKIP_TAGS or 'data-demo' in a or tag == 'aside' or tag == 'header'
            if skip:
                self.skip_depth += 1
            self.stack.append((tag, marker, skip))
        if self.skip_depth or not self.in_main:
            return
        if tag == 'section' and a.get('id'):
            self.section_id = a['id']
            self.section_title = ''
        if tag in ('h1', 'h2', 'h3'):
            self.heading = (int(tag[1]), [])

    def handle_endtag(self, tag):
        if tag == 'title':
            self.in_title = False
        if tag == 'a' and self.href:
            self.nav[self.href] = ''.join(self.link_chunks).strip()
            self.href = None
        if self.heading and tag in ('h1', 'h2', 'h3'):
            level, chunks = self.heading
            title = re.sub(r'\s+', ' ', ''.join(chunks)).strip()
            self.heading = None
            if level == 2 or level == 1:
                self.section_title = title
            self._start_entry(level, title)
        # снимаем тег со стека
        for i in range(len(self.stack) - 1, -1, -1):
            if self.stack[i][0] == tag:
                for _, _, skip in self.stack[i:]:
                    if skip:
                        self.skip_depth -= 1
                del self.stack[i:]
                break
        if tag == 'main':
            self.in_main = False

    def handle_data(self, data):
        if self.in_title:
            self.title += data
        if self.href is not None:
            self.link_chunks.append(data)
        if self.skip_depth or not self.in_main:
            return
        if self.heading:
            self.heading[1].append(data)
            return
        if self.cur is None:
            self._start_entry(1, '')
        self.cur[4].append(data)


def build():
    pages, entries = [], []
    h = hashlib.sha1()
    for f in PAGES:
        src = (ROOT / f).read_text(encoding='utf-8')
        h.update(f.encode()); h.update(src.encode())
        p = Extractor()
        p.feed(src)
        label = p.nav.get(f) or f
        sections = []
        for e in p.entries:
            if e[3] == 2 and e[0] and e[2] and all(s['id'] != e[0] for s in sections):
                sections.append({'id': e[0], 'title': e[2]})
        pages.append({'file': f, 'label': label, 'title': re.sub(r'\s+', ' ', p.title).strip(), 'sections': [] if f == 'index.html' else sections})
        for e in p.entries:
            text = re.sub(r'\s+', ' ', ''.join(e[4])).strip()
            title = e[2]
            if not title and not text:
                continue
            entries.append([f, e[0], e[1], title or label, e[3], text])
    # Deep-dive chapters are searchable and receive labels in SITE_DATA.
    # Empty sections keep them out of the legacy top-level reading-progress model.
    for f in CHAPTERS:
        src = (ROOT / f).read_text(encoding='utf-8')
        h.update(f.encode()); h.update(src.encode())
        p = Extractor()
        p.feed(src)
        label = CHAPTER_LABELS.get(f, Path(f).stem)
        page_title = re.sub(r'\s+', ' ', p.title).strip()
        pages.append({'file': f, 'label': label, 'title': page_title or label, 'sections': []})
        for e in p.entries:
            text = re.sub(r'\s+', ' ', ''.join(e[4])).strip()
            title = e[2]
            if not title and not text:
                continue
            entries.append([f, e[0], e[1], title or label, e[3], text])

    digest = h.hexdigest()[:12]
    data_js = '/* Сгенерировано tools/build-search-index.py — не редактируйте вручную. */\nwindow.SITE_DATA = ' + \
        json.dumps({'v': 1, 'src': digest, 'pages': pages}, ensure_ascii=False, separators=(',', ':')) + ';\n'
    index_js = '/* Сгенерировано tools/build-search-index.py — не редактируйте вручную. */\nwindow.SEARCH_INDEX = ' + \
        json.dumps({'v': 1, 'src': digest, 'entries': entries}, ensure_ascii=False, separators=(',', ':')) + ';\n'
    return data_js, index_js, len(entries)


def main():
    data_js, index_js, n = build()
    targets = {ROOT / 'assets' / 'site-data.js': data_js, ROOT / 'assets' / 'search-index.js': index_js}
    if '--check' in sys.argv:
        stale = [t.name for t, c in targets.items() if not t.exists() or t.read_text(encoding='utf-8') != c]
        if stale:
            print('Устарело: ' + ', '.join(stale) + '. Запустите: python3 tools/build-search-index.py')
            sys.exit(1)
        print('Индекс поиска актуален (%d записей).' % n)
        return
    for t, c in targets.items():
        t.write_text(c, encoding='utf-8')
        print('записано %s (%d КБ)' % (t.relative_to(ROOT), len(c.encode('utf-8')) // 1024))
    print('записей в индексе: %d' % n)


if __name__ == '__main__':
    main()

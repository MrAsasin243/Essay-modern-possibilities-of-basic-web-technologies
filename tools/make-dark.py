#!/usr/bin/env python3
"""
Генератор тёмных переопределений. Запускается РУЧНО, когда в assets/style.css или assets/demo.css
появились новые жёстко заданные светлые цвета. Результат кладётся в assets/site.css между маркерами
BEGIN GENERATED DARK / END GENERATED DARK. Сам сайт этот скрипт не использует (только стандартная библиотека).

  python3 tools/make-dark.py            — пересобрать блок в assets/site.css
  python3 tools/make-dark.py --report   — показать светлые цвета, для которых нет соответствия
"""
import re, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SOURCES = ['assets/style.css', 'assets/demo.css']
TARGET = ROOT / 'assets' / 'site.css'
BEGIN, END = '/* BEGIN GENERATED DARK */', '/* END GENERATED DARK */'

BG = {
    'white': 'var(--surface)', '#fff': 'var(--surface)', '#ffffff': 'var(--surface)',
    'rgba(255,255,255,.92)': 'rgba(15,20,25,.92)', 'rgba(255, 255, 255, .92)': 'rgba(15,20,25,.92)',
    '#f4f6fb': 'var(--bg)', '#f8f9fd': 'var(--surface-soft)', '#f7f9ff': 'var(--surface-soft)', '#f5f7fb': 'var(--surface-soft)',
    '#eef1f7': '#232c3b', '#eef2ff': 'var(--accent-soft)', '#edf1ff': 'var(--accent-soft)', '#e8eefc': '#1d2a4a', '#dbe4ff': '#243459',
    '#edfaf3': '#12291f', '#fff1f1': '#33191b', '#fff8e8': '#2e2512', '#fffaf0': '#2e2512', '#fff3d6': '#3a2d10',
    '#dcfce7': '#12291f', '#fecaca': '#4a2124', '#c7d0ee': '#3a4666', '#94a3d8': '#51618f',
}
TEXT = {
    '#172033': 'var(--text)', '#344054': '#c3cbd8', '#475467': '#b6bfcd', '#263c7b': '#c0d0ff', '#23429c': '#a9c1ff', '#203e9b': '#a9c1ff',
    '#344a85': '#b2c3f5', '#293a68': '#b6c3e6', '#3157c8': 'var(--accent)', '#a12626': '#ff8f8f', '#7a1f1f': '#ffb3b3',
    '#7c4a03': '#f3c77a', '#14532d': '#7fe0ac', '#8491ad': 'var(--muted)',
}
BORDER = {
    '#cbd5ee': '#33405a', '#b7c3e6': '#3a4666', '#dce3f2': '#2c3547', '#d9e1ff': '#2c3547', '#cbd2df': '#3a4666', '#aebdf0': '#4b5b85',
    '#e0a3a3': '#7a3b3b', '#b9e3cf': '#1f5a40', '#ecd6a0': '#6b5524', '#f0c4c4': '#6b2f33', '#94a3b8': '#5b6b86',
}
COLOR_RE = re.compile(r'#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)|\bwhite\b')
SKIP_AT = ('@keyframes', '@font-face', '@property', '@page')


def strip_comments(s):
    return re.sub(r'/\*.*?\*/', '', s, flags=re.S)


def split_block(text):
    """Делит тело на объявления верхнего уровня и вложенные блоки (selector, body)."""
    decls, nested, i, buf, depth = [], [], 0, '', 0
    while i < len(text):
        c = text[i]
        if c == '{':
            j, d = i + 1, 1
            while j < len(text) and d:
                d += (text[j] == '{') - (text[j] == '}')
                j += 1
            nested.append((buf.strip(), text[i + 1:j - 1]))
            buf, i = '', j
            continue
        if c == ';':
            if buf.strip():
                decls.append(buf.strip())
            buf = ''
        else:
            buf += c
        i += 1
    if buf.strip():
        decls.append(buf.strip())
    return decls, nested


def walk(text, at_stack, parent_sel, out):
    decls, nested = split_block(text)
    if parent_sel is not None:
        out.append((tuple(at_stack), parent_sel, decls))
    for head, body in nested:
        if head.startswith('@'):
            if head.startswith(SKIP_AT) or head.startswith('@media print'):
                continue
            walk(body, at_stack + [head], parent_sel, out) if parent_sel is not None else walk(body, at_stack + [head], None, out)
        elif parent_sel is None:
            walk(body, at_stack, head, out)
        else:
            sels = []
            for ps in split_sel(parent_sel):
                for s in split_sel(head):
                    sels.append(s.replace('&', ps) if '&' in s else ps + ' ' + s)
            walk(body, at_stack, ', '.join(sels), out)


def split_sel(s):
    out, depth, cur = [], 0, ''
    for c in s:
        if c in '([': depth += 1
        elif c in ')]': depth -= 1
        if c == ',' and depth == 0:
            out.append(cur.strip()); cur = ''
        else:
            cur += c
    out.append(cur.strip())
    return [x for x in out if x]


def remap(prop, value, leftover):
    table = BG if prop.startswith('background') else TEXT if prop == 'color' else BORDER if ('border' in prop or 'outline' in prop) else None
    if table is None:
        return value
    def sub(m):
        raw = m.group(0).lower()
        if raw in table:
            return table[raw]
        leftover.add((prop.split('-')[0], raw))
        return m.group(0)
    return COLOR_RE.sub(sub, value)


def main():
    rules, leftover = [], set()
    for src in SOURCES:
        text = strip_comments((ROOT / src).read_text(encoding='utf-8'))
        text = re.sub(r':root\s*\{[^{}]*\}', '', text)          # переменные :root задаются вручную в site.css
        out = []
        walk(text, [], None, out)
        for at, sel, decls in out:
            if sel.startswith(':root') or sel in ('html', 'body', '*') and False:
                continue
            new = []
            for d in decls:
                if ':' not in d:
                    continue
                prop, val = d.split(':', 1)
                prop, val = prop.strip(), val.strip()
                if prop.startswith('--'):
                    continue
                nv = remap(prop, val, leftover)
                if nv != val:
                    new.append('%s: %s' % (prop, nv))
            if new:
                rules.append((at, sel, new))
    if '--report' in sys.argv:
        print('Цвета без соответствия (оставлены как есть):')
        for k, c in sorted(leftover):
            print('  %-10s %s' % (k, c))
        print('Всего переопределённых правил:', len(rules))
        return

    def emit(prefix_forced):
        lines = []
        for at, sel, decls in rules:
            sels = ', '.join(prefix_forced + ' ' + s for s in split_sel(sel))
            block = sels + ' { ' + '; '.join(decls) + '; }'
            for a in reversed(at):
                block = a + ' { ' + block + ' }'
            lines.append(block)
        return '\n'.join(lines)

    gen = ('%s\n/* Тёмные переопределения для жёстко заданных светлых цветов. Только для экрана: при печати всегда светлая схема. */\n'
           '@media screen {\n%s\n}\n@media screen and (prefers-color-scheme: dark) {\n%s\n}\n%s\n') % (
        BEGIN, emit(':root[data-theme="dark"]'), emit(':root:not([data-theme="light"])'), END)
    css = TARGET.read_text(encoding='utf-8')
    if BEGIN in css:
        css = re.sub(re.escape(BEGIN) + r'.*?' + re.escape(END) + r'\n?', lambda m: gen, css, flags=re.S)
    else:
        css += '\n' + gen
    TARGET.write_text(css, encoding='utf-8')
    print('переопределённых правил: %d; без соответствия: %d (запустите с --report)' % (len(rules), len(leftover)))


if __name__ == '__main__':
    main()

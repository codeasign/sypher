import copy

def find_words(board_orig, words):
    board = copy.deepcopy(board_orig)
    rows, cols = len(board), len(board[0])
    result = []

    # Build Trie
    root = {}
    for word in words:
        node = root
        for ch in word:
            if ch not in node:
                node[ch] = {}
            node = node[ch]
        node['END'] = word

    def dfs(r, c, node):
        if r < 0 or r >= rows or c < 0 or c >= cols:
            return
        ch = board[r][c]
        if ch not in node:
            return
        next_node = node[ch]
        if 'END' in next_node:
            result.append(next_node['END'])
            del next_node['END']

        board[r][c] = '#'
        for dr, dc in [(-1,0),(1,0),(0,-1),(0,1)]:
            dfs(r+dr, c+dc, next_node)
        board[r][c] = ch

    for r in range(rows):
        for c in range(cols):
            dfs(r, c, root)

    result.sort()
    return result

def parse_stdin(stdin_str):
    lines = stdin_str.strip().split('\n')
    rows, cols = map(int, lines[0].split())
    board = [lines[i+1].split() for i in range(rows)]
    words = lines[rows+1].split()
    return board, words

test_inputs = [
    ('3 4\no a a n\ne t a e\ni h k r\noath pea eat rain\n', 'eat oath'),
    ('1 1\na\na\n', 'a'),
    ('2 2\nab\ncd\nab cd\n', 'ab cd'),
    ('3 3\na b c\nd e f\ng h i\nabc def ghi\n', ''),
    ('3 3\na b c\nd e f\ng h i\nae\n', ''),
    ('2 2\na a\na a\naa\n', 'aa'),
    ('3 4\no a a n\ne t a e\ni h k r\nhklr\n', ''),
    ('1 1\nx\nxyz\n', ''),
    ('4 4\nb a t h\nc a t s\nd o g s\nr a t s\nbat cat dog rat\n', 'bat cat dog rat'),
    ('3 3\na a a\na a a\na a a\naaa aaaaa a\n', 'a aa aaa'),
    ('3 4\ns e e d\nf e e d\nl e e d\nseed feed lead\n', 'feed lead seed'),
    ('2 3\nc a r\na r e\ncar care\n', 'car care'),
    ('3 3\nw o r\nd o g\nc a t\nworld dog cat\n', 'cat dog'),
    ('1 5\nh e l l o\nhello hell\n', 'hell hello'),
    ('3 3\na b c\nd e f\ng h i\nabcdefghi\n', 'abcdefghi'),
    ('2 2\np q\nr s\npq ps rs\n', ''),
    ('3 3\nt r y\nr u n\nf o r\ntry run for\n', 'for run try'),
    ('4 4\nm i n t\ni n t o\nn t e r\nt e r m\nmint into term\n', 'into mint term'),
    ('1 3\na b c\na b c\n', 'a b c'),
    ('3 3\nx y z\ny y y\nz y x\nxyz xxy yyx\n', ''),
]

for i, (stdin, expected) in enumerate(test_inputs):
    board, words = parse_stdin(stdin)
    result = find_words(board, words)
    result_str = ' '.join(result)
    if result_str != expected:
        print("MISMATCH test %d:" % (i+1))
        print("  board: %s" % board)
        print("  words: %s" % words)
        print("  expected: %r" % expected)
        print("  got:      %r" % result_str)
    else:
        print("OK test %d: %r" % (i+1, result_str))

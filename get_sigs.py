import ast
import os

for filename in os.listdir('backend/services'):
    if not filename.endswith('.py'): continue
    with open(f'backend/services/{filename}', 'r', encoding='utf-8') as f:
        tree = ast.parse(f.read())
        funcs = [n for n in tree.body if isinstance(n, ast.FunctionDef)]
        classes = [n for n in tree.body if isinstance(n, ast.ClassDef)]
        if funcs or classes:
            print(f'\n--- {filename} ---')
            for fnode in funcs:
                if not fnode.name.startswith('_'):
                    args = [a.arg for a in fnode.args.args]
                    arg_str = ", ".join(args)
                    print(f'def {fnode.name}({arg_str})')
            for cnode in classes:
                print(f'class {cnode.name}:')
                for node in cnode.body:
                    if isinstance(node, ast.FunctionDef) and not node.name.startswith('_'):
                        args = [a.arg for a in node.args.args]
                        arg_str = ", ".join(args)
                        print(f'    def {node.name}({arg_str})')

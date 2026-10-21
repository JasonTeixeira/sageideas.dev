import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'))
const writeJson = (path, value) => {
  mkdirSync(path.slice(0, path.lastIndexOf('/')), { recursive: true })
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`)
}

const programmingSlug = 'programming-fundamentals'
const programmingLessons = readJson(`data/academy/authoring/${programmingSlug}.lessons.json`)
const programmingAdded = {
  'your-first-program': { language: 'python', code: 'print("Hello, world!")\n' },
  'variables-and-values': { language: 'python', code: 'per_crate = 12\ncrates = 4\ntotal = per_crate * crates\nprint(total)\n' },
  'numbers-and-strings': { language: 'python', code: 'item = "Coffee"\nprice = 4\nqty = 3\ntotal = price * qty\nprint(f"{item} x{qty} = ${total}")\n' },
  'reading-input': { language: 'python', stdin: 'Sam\n3', code: 'name = input()\ncount = int(input())\nprint(f"{name}, you have {count} items.")\n' },
  'booleans-and-logic': { language: 'python', code: 'score = 84\nif score >= 90:\n    print("Grade: A")\nelif score >= 70:\n    print("Grade: B")\nelse:\n    print("Grade: C")\n' },
  lists: { language: 'python', code: 'cart = ["milk", "bread", "apples"]\ncart.append("eggs")\nprint(cart[0])\nprint(len(cart))\n' },
  loops: { language: 'python', code: 'prices = [10, 25, 5, 20]\ntotal = 0\nfor price in prices:\n    total += price\nprint(total)\n' },
}
const pythonBodies = {
  'functions-basics': '    return unit_price * qty',
  'build-a-tiny-program': 'def summarize(scores):\n    total = 0\n    passed = 0\n    for score in scores:\n        total += score\n        if score >= 60:\n            passed += 1\n    print(f"Passed: {passed} of {len(scores)}")\n    return total / len(scores)\n\navg = summarize(scores)\nprint(f"Average: {int(avg)}")',
  'input-validation': '    if isinstance(value, bool) or not isinstance(value, int):\n        raise ValueError("age must be an integer")\n    if not 0 <= value <= 120:\n        raise ValueError("age must be between 0 and 120")\n    return value',
  'error-handling': '    try:\n        return a / b\n    except ZeroDivisionError as error:\n        raise ValueError("cannot divide by zero") from error',
  'types-and-data': '    total = 0\n    for value in values:\n        total += int(value)\n    return total',
  'control-flow': '    return [order for order in orders if order["status"] != "cancelled"]',
  'files-and-io': '    config = {}\n    with open(path) as handle:\n        for line in handle:\n            line = line.strip()\n            if not line:\n                continue\n            key, value = line.split("=", 1)\n            config[key] = value\n    return config',
  'testing-and-debugging': '    return sum(numbers) / len(numbers) if numbers else 0',
  'cli-workflow': '    if not args.get("execute"):\n        return "dry-run"\n    if args.get("env") == "production" and not args.get("confirmed"):\n        return "blocked: confirm production"\n    return "execute"',
  'git-fundamentals': '    normalized = message.strip().lower()\n    if not staged_files:\n        return "nothing to commit"\n    if normalized in LAZY or len(normalized) < 10:\n        return "weak message"\n    return "ok"',
}
function solvePythonStarter(key, starter) {
  if (key === 'functions-and-modules') {
    return starter.replace('    return (price * qty) - discount   # <-- hidden dependency on a global; fix this', '    return price * qty')
  }
  const body = pythonBodies[key]
  if (!body) throw new Error(`${key}: missing Python completion`)
  const marker = key === 'build-a-tiny-program' ? '  # your code here' : '    ...  # your code here'
  if (!starter.includes(marker)) throw new Error(`${key}: Python TODO marker drift`)
  return starter.replace(marker, body)
}
const programmingSolutions = Object.fromEntries(Object.keys(programmingLessons).map((key) => {
  if (programmingAdded[key]) return [key, programmingAdded[key]]
  const lab = programmingLessons[key].find((block) => block.type === 'lab')
  return [key, { language: 'python', code: `${solvePythonStarter(key, lab.starter).trimEnd()}\n`, ...(lab.stdin ? { stdin: lab.stdin } : {}) }]
}))
if (Object.values(programmingSolutions).some((value) => !value)) throw new Error('Programming Fundamentals solution coverage drift')
const programmingRuntime = mkdtempSync(join(tmpdir(), 'academy-programming-closure-'))
try {
  for (const [key, blocks] of Object.entries(programmingLessons)) {
    const lab = blocks.find((block) => block.type === 'lab')
    const result = spawnSync('python3', ['-I', '-c', programmingSolutions[key].code], {
      cwd: programmingRuntime,
      encoding: 'utf8',
      input: lab.stdin ?? '',
      timeout: 10_000,
    })
    if (result.status !== 0 || result.stderr) throw new Error(`${key}: Python reference failed: ${result.stderr}`)
    lab.check = result.stdout.trimEnd()
  }
} finally {
  rmSync(programmingRuntime, { recursive: true, force: true })
}
writeJson(`data/academy/authoring/${programmingSlug}.lessons.json`, programmingLessons)
writeJson(`data/academy/authoring/${programmingSlug}.lab_solutions.json`, programmingSolutions)

const gitSlug = 'git-the-terminal'
const gitLessons = readJson(`data/academy/authoring/${gitSlug}.lessons.json`)
const completions = {
  'terminal-filesystem-model': 'mkdir -p project/src project/docs\ncd project/src\necho "at: ${PWD#$START/}"\necho "parent contains:"\nls -1 .. | sort',
  'navigate-inspect-files': String.raw`seq 1 100 > data.txt
echo "lines: $(wc -l < data.txt | tr -d ' ')"
echo "first three:"
head -n 3 data.txt`,
  'pipes-redirects-grep-find': String.raw`grep -c ERROR app.log > errors.count
echo "error lines: $(cat errors.count)"
echo "total lines: $(wc -l < app.log | tr -d ' ')"`,
  'permissions-processes': String.raw`echo '#!/bin/sh' > run.sh
chmod 754 run.sh
echo "mode 754 -> $(ls -l run.sh | cut -c1-10)"
chmod 600 run.sh
echo "mode 600 -> $(ls -l run.sh | cut -c1-10)"`,
  'git-object-model': String.raw`echo "HEAD is a: $(git cat-file -t HEAD)"
echo "its tree is a: $(git cat-file -t HEAD^{tree})"
BLOB=$(git rev-parse HEAD:README.md)
echo "README.md blob is a: $(git cat-file -t "$BLOB")"
echo "tree entries:"
git cat-file -p HEAD^{tree} | awk '{print $2, $4}'`,
  'staging-index-commits': String.raw`git add app.js
echo "porcelain:"
git status --porcelain | sort`,
  'reading-history': String.raw`echo "commits: $(git rev-list --count HEAD)"
echo "subjects (newest first):"
git log --pretty=format:'%s' && echo`,
  branches: String.raw`echo "main tip:    $(git log -1 --pretty=%s main)"
echo "feature tip: $(git log -1 --pretty=%s feature)"
echo "shared base: $(git log -1 --pretty=%s "$(git merge-base main feature)")"`,
  'remotes-push-pull-fetch': String.raw`git push -q origin main
echo "pushed branch: $(git rev-parse --abbrev-ref HEAD)"
echo "remote tip subject: $(git --git-dir=../remote.git log -1 --pretty=%s main)"`,
  'pull-requests-review': String.raw`echo "PR commits:"
git log --pretty=format:'%s' main..feature && echo
echo "PR changed files:"
git diff --name-only main..feature | sort`,
  'resolving-merge-conflicts': String.raw`printf 'timeout: 45\n' > config.yml
git add config.yml
git commit -qm "merge: settle timeout to 45"
echo "resolved file:"
cat config.yml
echo "status: $(git status --porcelain | wc -l | tr -d ' ') pending"`,
  'rebase-vs-merge': String.raw`git switch feature 2>/dev/null
git rebase -q main
echo "B (rebase) parents of tip: $(git cat-file -p HEAD | grep -c '^parent')"
echo "B (rebase) total commits:  $(git rev-list --count HEAD)"`,
  'reflog-recovering-work': String.raw`git reset --hard 'HEAD@{1}' >/dev/null
echo "recovered file: $(cat work.txt)"
echo "commits after recovery: $(git rev-list --count HEAD)"
echo "recovered subject: $(git log -1 --pretty=%s)"`,
  'stash-cherry-pick': String.raw`git cherry-pick "$PICK" >/dev/null
echo "cherry-picked file present: $(cat fix.txt)"
echo "main now has fix.txt: $(git ls-files fix.txt)"`,
  'git-bisect': String.raw`GOOD=$(git rev-list --max-parents=0 HEAD)
git bisect start >/dev/null 2>&1
git bisect bad HEAD >/dev/null 2>&1
OUT=$(git bisect good "$GOOD" 2>/dev/null; git bisect run ./test.sh 2>/dev/null)
git bisect reset >/dev/null 2>&1
BADHASH=$(echo "$OUT" | sed -n 's/^\([0-9a-f]\{7,\}\) is the first bad commit$/\1/p' | head -1)
echo "first bad commit subject: $(git log -1 --pretty=%s "$BADHASH")"`,
  'gitignore-hooks': String.raw`cat > .gitignore <<'IGN'
.env*
!.env.example
dist/*
!dist/keep.js
IGN
echo "working (dist/*): dist/keep.js re-included? $(git check-ignore -q dist/keep.js && echo 'no (parent excluded)' || echo yes)"
git add -A
echo "trackable paths:"
git status --porcelain | sort`,
  'tags-releases': String.raw`git tag v1.0.0-light
git tag -a v1.0.0 -m "First stable release"
echo "lightweight v1.0.0-light -> $(git cat-file -t v1.0.0-light)"
echo "annotated  v1.0.0       -> $(git cat-file -t v1.0.0)"
echo "tag count: $(git tag | wc -l | tr -d ' ')"`,
  'terminal-power-user': String.raw`a=$(true; echo $?); b=$(false; echo $?)
echo "true=$a false=$b (sum $((a+b)))"
echo "s1 verdict $(verdict s1.txt); s2 verdict $(verdict s2.txt)"
passed=0
for f in s1.txt s2.txt; do grep -q PASS "$f" && passed=$((passed+1)); done
echo "$passed of 2 stages passed -> $([ "$passed" -eq 2 ] && echo release || echo hold)"`,
  'capstone-recover-and-ship': String.raw`git tag -a v1.0.1 -m "restore + harden config"
echo "release tag: $(git tag) (type $(git cat-file -t v1.0.1))"`,
}
const undoInsertion = String.raw`git restore --staged setting.txt
echo "after unstage: $(git status --porcelain)"
echo "working copy still: $(cat setting.txt)"
`
const gitSolutions = {}
for (const [key, blocks] of Object.entries(gitLessons)) {
  const lab = blocks.find((block) => block.type === 'lab')
  if (!lab || lab.language !== 'shell') throw new Error(`${key}: missing shell lab`)
  if (key === 'gitignore-hooks' && !lab.starter.includes('GIT_CONFIG_GLOBAL')) {
    lab.starter = `export GIT_CONFIG_GLOBAL=/dev/null # isolate this lab from user-level exclude rules\n${lab.starter}`
  }
  let code = lab.starter.trimEnd()
  if (key === 'undo-safely') code = code.replace('# TODO 2:', `${undoInsertion}# TODO 2:`)
  else {
    const completion = completions[key]
    if (!completion) throw new Error(`${key}: missing Git completion`)
    code = `${code}\n${completion}`
  }
  gitSolutions[key] = { language: 'shell', code: `${code}\n` }
}
writeJson(`data/academy/authoring/${gitSlug}.lab_solutions.json`, gitSolutions)

const retrievedAt = '2026-08-28'
const source = (source_id, title, organization, url, keywords) => ({ source_id, title, organization, url, source_tier: 1, retrieved_at: retrievedAt, keywords })
const pythonSources = [
  source('python-tutorial', 'The Python Tutorial', 'Python Software Foundation', 'https://docs.python.org/3/tutorial/index.html', ['Python', 'programming', 'tutorial']),
  source('python-introduction', 'An Informal Introduction to Python', 'Python Software Foundation', 'https://docs.python.org/3/tutorial/introduction.html', ['numbers', 'strings', 'variables']),
  source('python-control-flow', 'More Control Flow Tools', 'Python Software Foundation', 'https://docs.python.org/3/tutorial/controlflow.html', ['conditionals', 'loops', 'functions']),
  source('python-data-structures', 'Data Structures', 'Python Software Foundation', 'https://docs.python.org/3/tutorial/datastructures.html', ['lists', 'dictionaries', 'sets']),
  source('python-modules', 'Modules', 'Python Software Foundation', 'https://docs.python.org/3/tutorial/modules.html', ['modules', 'packages', 'imports']),
  source('python-io', 'Input and Output', 'Python Software Foundation', 'https://docs.python.org/3/tutorial/inputoutput.html', ['input', 'output', 'files']),
  source('python-errors', 'Errors and Exceptions', 'Python Software Foundation', 'https://docs.python.org/3/tutorial/errors.html', ['errors', 'exceptions', 'validation']),
  source('python-builtins', 'Built-in Functions', 'Python Software Foundation', 'https://docs.python.org/3/library/functions.html', ['built-ins', 'input', 'types']),
  source('python-json', 'JSON Encoder and Decoder', 'Python Software Foundation', 'https://docs.python.org/3/library/json.html', ['JSON', 'serialization', 'files']),
  source('python-pathlib', 'Object-oriented Filesystem Paths', 'Python Software Foundation', 'https://docs.python.org/3/library/pathlib.html', ['paths', 'files', 'filesystem']),
  source('python-unittest', 'Unit Testing Framework', 'Python Software Foundation', 'https://docs.python.org/3/library/unittest.html', ['testing', 'assertions', 'fixtures']),
  source('python-argparse', 'Parser for Command-line Options', 'Python Software Foundation', 'https://docs.python.org/3/library/argparse.html', ['CLI', 'arguments', 'automation']),
  source('python-pep8', 'PEP 8 – Style Guide for Python Code', 'Python Software Foundation', 'https://peps.python.org/pep-0008/', ['style', 'readability', 'conventions']),
]
const ledgers = {
  'programming-fundamentals': pythonSources,
  'python-basics': [...pythonSources.slice(0, 9),
    source('python-venv', 'Creation of Virtual Environments', 'Python Software Foundation', 'https://docs.python.org/3/library/venv.html', ['virtual environments', 'dependencies']),
    source('python-debugger', 'The Python Debugger', 'Python Software Foundation', 'https://docs.python.org/3/library/pdb.html', ['debugging', 'breakpoints']),
    source('python-urllib', 'URL Handling Modules', 'Python Software Foundation', 'https://docs.python.org/3/library/urllib.html', ['HTTP', 'URLs', 'APIs']),
    source('python-typing', 'Support for Type Hints', 'Python Software Foundation', 'https://docs.python.org/3/library/typing.html', ['types', 'interfaces', 'validation']),
  ],
  'career-engineering_judgment_foundation': [
    source('nasa-systems-engineering', 'NASA Systems Engineering Handbook', 'NASA', 'https://www.nasa.gov/reference/systems-engineering-handbook/', ['problem framing', 'verification', 'tradeoffs']),
    source('nist-rmf', 'Risk Management Framework', 'NIST', 'https://csrc.nist.gov/projects/risk-management/about-rmf', ['risk', 'evidence', 'monitoring']),
    source('nist-csf', 'Cybersecurity Framework', 'NIST', 'https://www.nist.gov/cyberframework', ['governance', 'risk', 'recovery']),
    source('cisa-playbooks', 'Incident and Vulnerability Response Playbooks', 'CISA', 'https://www.cisa.gov/news-events/news/incident-and-vulnerability-response-playbooks', ['diagnosis', 'response', 'repair']),
    source('google-postmortems', 'Postmortem Culture: Learning from Failure', 'Google SRE', 'https://sre.google/sre-book/postmortem-culture/', ['failure', 'learning', 'repair']),
    source('google-code-review', 'Google Engineering Practices: Code Review', 'Google', 'https://google.github.io/eng-practices/review/', ['review', 'feedback', 'quality']),
    source('dora-capabilities', 'DORA Capabilities', 'DORA', 'https://dora.dev/capabilities/', ['delivery', 'measurement', 'learning']),
    source('aws-well-architected', 'AWS Well-Architected Framework', 'AWS', 'https://docs.aws.amazon.com/wellarchitected/latest/framework/welcome.html', ['tradeoffs', 'reliability', 'review']),
    source('azure-architecture', 'Azure Architecture Center', 'Microsoft', 'https://learn.microsoft.com/en-us/azure/architecture/', ['architecture', 'decisions', 'patterns']),
    source('ietf-consensus', 'RFC 7282: On Consensus and Humming in the IETF', 'IETF', 'https://www.rfc-editor.org/rfc/rfc7282.html', ['decisions', 'objections', 'consensus']),
    source('us-digital-playbook', 'U.S. Digital Services Playbook', 'U.S. CIO Council', 'https://playbook.cio.gov/', ['outcomes', 'delivery', 'evidence']),
    source('ieee-ethics', 'IEEE Code of Ethics', 'IEEE', 'https://www.ieee.org/about/ethics/code-of-ethics.html', ['responsibility', 'honesty', 'harm']),
    source('google-tech-writing', 'Technical Writing Courses', 'Google for Developers', 'https://developers.google.com/tech-writing', ['explanation', 'clarity', 'audience']),
  ],
  'career-programming_cs_foundations': [
    ...pythonSources.slice(0, 8),
    source('python-complexity', 'Time Complexity', 'Python Software Foundation', 'https://wiki.python.org/moin/TimeComplexity', ['complexity', 'Big O', 'collections']),
    source('rfc-json', 'RFC 8259: The JavaScript Object Notation Data Interchange Format', 'IETF', 'https://www.rfc-editor.org/rfc/rfc8259.html', ['JSON', 'data interchange']),
    source('rfc-http', 'RFC 9110: HTTP Semantics', 'IETF', 'https://www.rfc-editor.org/rfc/rfc9110.html', ['HTTP', 'requests', 'responses']),
    source('rfc-dns', 'RFC 1034: Domain Names—Concepts and Facilities', 'IETF', 'https://www.rfc-editor.org/rfc/rfc1034.html', ['DNS', 'names', 'resolution']),
    source('rfc-tls', 'RFC 8446: TLS 1.3', 'IETF', 'https://www.rfc-editor.org/rfc/rfc8446.html', ['TLS', 'security', 'networking']),
  ],
  'git-the-terminal': [
    source('git', 'Git Reference Manual', 'Git Project', 'https://git-scm.com/docs/git', ['Git', 'repository', 'commands']),
    source('git-init', 'git-init', 'Git Project', 'https://git-scm.com/docs/git-init', ['repository', 'initialization']),
    source('git-status', 'git-status', 'Git Project', 'https://git-scm.com/docs/git-status', ['working tree', 'index', 'status']),
    source('git-log', 'git-log', 'Git Project', 'https://git-scm.com/docs/git-log', ['history', 'commits']),
    source('git-branch', 'git-branch', 'Git Project', 'https://git-scm.com/docs/git-branch', ['branches', 'refs']),
    source('git-remote', 'git-remote', 'Git Project', 'https://git-scm.com/docs/git-remote', ['remotes', 'tracking']),
    source('git-push', 'git-push', 'Git Project', 'https://git-scm.com/docs/git-push', ['push', 'remote refs']),
    source('git-merge', 'git-merge', 'Git Project', 'https://git-scm.com/docs/git-merge', ['merge', 'conflicts']),
    source('git-rebase', 'git-rebase', 'Git Project', 'https://git-scm.com/docs/git-rebase', ['rebase', 'history']),
    source('git-revert', 'git-revert', 'Git Project', 'https://git-scm.com/docs/git-revert', ['undo', 'shared history']),
    source('git-reflog', 'git-reflog', 'Git Project', 'https://git-scm.com/docs/git-reflog', ['recovery', 'references']),
    source('git-bisect', 'git-bisect', 'Git Project', 'https://git-scm.com/docs/git-bisect', ['debugging', 'binary search']),
    source('gitignore', 'gitignore', 'Git Project', 'https://git-scm.com/docs/gitignore', ['ignore rules', 'negation']),
    source('git-tag', 'git-tag', 'Git Project', 'https://git-scm.com/docs/git-tag', ['tags', 'releases']),
  ],
  'data-structures': [
    source('python-data-structures', 'Data Structures', 'Python Software Foundation', 'https://docs.python.org/3/tutorial/datastructures.html', ['lists', 'stacks', 'queues']),
    source('python-collections', 'Container Datatypes', 'Python Software Foundation', 'https://docs.python.org/3/library/collections.html', ['deque', 'counter', 'mapping']),
    source('python-heapq', 'Heap Queue Algorithm', 'Python Software Foundation', 'https://docs.python.org/3/library/heapq.html', ['heap', 'priority queue']),
    source('python-bisect', 'Array Bisection Algorithm', 'Python Software Foundation', 'https://docs.python.org/3/library/bisect.html', ['binary search', 'sorted arrays']),
    source('python-datamodel', 'Data Model', 'Python Software Foundation', 'https://docs.python.org/3/reference/datamodel.html', ['hashing', 'identity', 'objects']),
    source('java-collections', 'Collections Framework', 'Oracle', 'https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/util/doc-files/coll-overview.html', ['collections', 'interfaces', 'implementations']),
    source('java-hashmap', 'HashMap', 'Oracle', 'https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/util/HashMap.html', ['hash map', 'load factor', 'keys']),
    source('cpp-containers', 'Containers Library', 'C++ Reference', 'https://en.cppreference.com/w/cpp/container.html', ['arrays', 'lists', 'maps']),
    source('go-heap', 'Package heap', 'Go Project', 'https://pkg.go.dev/container/heap', ['heap', 'priority queue']),
    source('go-list', 'Package list', 'Go Project', 'https://pkg.go.dev/container/list', ['linked list', 'container']),
    source('rust-collections', 'Collections', 'Rust Project', 'https://doc.rust-lang.org/std/collections/', ['vectors', 'maps', 'sets']),
    source('networkx-traversal', 'Traversal', 'NetworkX', 'https://networkx.org/documentation/stable/reference/algorithms/traversal.html', ['BFS', 'DFS', 'graphs']),
    source('unicode-trie', 'Unicode Technical Standard #39', 'Unicode Consortium', 'https://www.unicode.org/reports/tr39/', ['strings', 'keys', 'normalization']),
  ],
  'career-networking_fundamentals_advanced_networking': [
    source('rfc-ipv4', 'RFC 791: Internet Protocol', 'IETF', 'https://www.rfc-editor.org/rfc/rfc791.html', ['IPv4', 'packets', 'routing']),
    source('rfc-ipv6', 'RFC 8200: IPv6 Specification', 'IETF', 'https://www.rfc-editor.org/rfc/rfc8200.html', ['IPv6', 'packets', 'headers']),
    source('rfc-tcp', 'RFC 9293: Transmission Control Protocol', 'IETF', 'https://www.rfc-editor.org/rfc/rfc9293.html', ['TCP', 'connections', 'reliability']),
    source('rfc-udp', 'RFC 768: User Datagram Protocol', 'IETF', 'https://www.rfc-editor.org/rfc/rfc768.html', ['UDP', 'datagrams']),
    source('rfc-dns-concepts', 'RFC 1034: Domain Names—Concepts and Facilities', 'IETF', 'https://www.rfc-editor.org/rfc/rfc1034.html', ['DNS', 'resolution', 'caching']),
    source('rfc-dns-implementation', 'RFC 1035: Domain Names—Implementation and Specification', 'IETF', 'https://www.rfc-editor.org/rfc/rfc1035.html', ['DNS', 'messages', 'records']),
    source('rfc-http', 'RFC 9110: HTTP Semantics', 'IETF', 'https://www.rfc-editor.org/rfc/rfc9110.html', ['HTTP', 'methods', 'status']),
    source('rfc-tls', 'RFC 8446: TLS 1.3', 'IETF', 'https://www.rfc-editor.org/rfc/rfc8446.html', ['TLS', 'handshake', 'certificates']),
    source('rfc-quic', 'RFC 9000: QUIC', 'IETF', 'https://www.rfc-editor.org/rfc/rfc9000.html', ['QUIC', 'transport', 'latency']),
    source('rfc-cidr', 'RFC 4632: Classless Inter-domain Routing', 'IETF', 'https://www.rfc-editor.org/rfc/rfc4632.html', ['CIDR', 'subnets', 'routing']),
    source('nist-firewalls', 'Guidelines on Firewalls and Firewall Policy', 'NIST', 'https://csrc.nist.gov/pubs/sp/800/41/r1/final', ['firewalls', 'policy', 'boundaries']),
    source('nist-zero-trust', 'Zero Trust Architecture', 'NIST', 'https://csrc.nist.gov/pubs/sp/800/207/final', ['zero trust', 'identity', 'access']),
    source('cisa-zero-trust', 'Zero Trust Maturity Model', 'CISA', 'https://www.cisa.gov/resources-tools/resources/zero-trust-maturity-model', ['zero trust', 'maturity', 'access']),
    source('aws-vpc', 'What is Amazon VPC?', 'Amazon Web Services', 'https://docs.aws.amazon.com/vpc/latest/userguide/what-is-amazon-vpc.html', ['VPC', 'subnets', 'routes']),
    source('kubernetes-networking', 'Cluster Networking', 'Kubernetes', 'https://kubernetes.io/docs/concepts/cluster-administration/networking/', ['services', 'ingress', 'network policy']),
  ],
}
for (const [slug, sources] of Object.entries(ledgers)) writeJson(`docs/academy/evidence/${slug}/sources.json`, sources)
console.log('Closed 27 foundation reference gaps and wrote seven authoritative source ledgers.')

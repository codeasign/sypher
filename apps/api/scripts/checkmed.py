import sys, json
d = json.load(open('apps/web/question-bank/azure-ai-200/medium.json', encoding='utf-8'))
counts = {}
for x in d['questions']:
    counts[x['domain']] = counts.get(x['domain'], 0) + 1
print('OFFICIAL-DOMAINS:', json.dumps(counts, indent=1))

e = json.load(open('apps/web/question-bank/aws-generative-ai-developer-professional/medium.json', encoding='utf-8'))
print('extra =', len(d['questions']), 'first =', d['questions'][0]['id'], 'last =', d['questions'][-1]['id'])
print('medium =', len(e['questions']), 'total =', len(e['questions']) + len(d['questions']), 'need =', 200 - len(e['questions']) - len(d['questions']))
seen = set()
dups = []
for x in d['questions']:
    if x['id'] in seen:
        dups.append(x['id'])
    seen.add(x['id'])
print('id-dupes =', dups)
print('header =', ','.join(d.keys()))
print('qkeys =', ','.join(d['questions'][0].keys()))



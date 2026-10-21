import { readFileSync, writeFileSync } from 'node:fs'

const lessonPath = 'data/academy/authoring/programming-fundamentals.lessons.json'
const lessons = JSON.parse(readFileSync(lessonPath, 'utf8'))

const requiredBlock = (blocks, type, slug) => {
  const block = blocks.find((candidate) => candidate.type === type)
  if (!block) throw new Error(`${slug}: cannot derive mastery content without ${type}`)
  return block
}

const insertBefore = (blocks, beforeType, block) => {
  const index = blocks.findIndex((candidate) => candidate.type === beforeType)
  if (index < 0) throw new Error(`Cannot insert ${block.type}: missing ${beforeType}`)
  blocks.splice(index, 0, block)
}

const insertAfter = (blocks, afterType, block) => {
  const index = blocks.findIndex((candidate) => candidate.type === afterType)
  if (index < 0) throw new Error(`Cannot insert ${block.type}: missing ${afterType}`)
  blocks.splice(index + 1, 0, block)
}

for (const [slug, blocks] of Object.entries(lessons)) {
  const contract = requiredBlock(blocks, 'sprint-contract', slug)
  const debug = requiredBlock(blocks, 'debug', slug)
  const verification = requiredBlock(blocks, 'verification', slug)
  const transfer = requiredBlock(blocks, 'transfer', slug)

  if (!blocks.some((block) => block.type === 'worked-example') && contract.intensity !== 'micro') {
    const walkthrough = requiredBlock(blocks, 'code-walkthrough', slug)
    insertBefore(blocks, 'concept', {
      type: 'worked-example',
      intro: `${walkthrough.title}. ${walkthrough.subtitle ?? 'Trace the complete model before changing it.'}`,
      code: walkthrough.code,
      language: walkthrough.language,
      steps: walkthrough.steps.map((step) =>
        `${step.label}: ${step.note ?? `inspect line${step.lines.length === 1 ? '' : 's'} ${step.lines.join(', ')}`}`,
      ),
      commonMistake: debug.symptom,
    })
  }

  // A verified lab receipt is bound to its canonical block index. Adding the
  // worked example before the lab must therefore be offset by moving the
  // preserved animated walkthrough to the post-lab debrief position.
  const workedExampleIndex = blocks.findIndex((block) => block.type === 'worked-example')
  const walkthroughIndex = blocks.findIndex((block) => block.type === 'code-walkthrough')
  const labIndex = blocks.findIndex((block) => block.type === 'lab')
  if (workedExampleIndex >= 0 && walkthroughIndex >= 0 && walkthroughIndex < labIndex) {
    const [walkthrough] = blocks.splice(walkthroughIndex, 1)
    const currentLabIndex = blocks.findIndex((block) => block.type === 'lab')
    blocks.splice(currentLabIndex + 1, 0, walkthrough)
  }

  if (!blocks.some((block) => block.type === 'tradeoff') && contract.intensity !== 'micro') {
    const comparison = requiredBlock(blocks, 'compare', slug)
    insertAfter(blocks, 'debug', {
      type: 'tradeoff',
      question: comparison.title,
      optionA: {
        label: comparison.left.label,
        text: `${comparison.left.lines.join(' · ')} Outcome: ${comparison.left.verdict}`,
      },
      optionB: {
        label: comparison.right.label,
        text: `${comparison.right.lines.join(' · ')} Outcome: ${comparison.right.verdict}`,
      },
      guidance: comparison.caption,
    })
  }

  if (!blocks.some((block) => block.type === 'calibration') && contract.intensity === 'capstone') {
    insertBefore(blocks, 'transfer', {
      type: 'calibration',
      artifact: contract.proof,
      weak: 'The program only handles the demonstration input, hardcodes a required result, or cannot explain a failing case.',
      passing: `The artifact satisfies every verification item: ${verification.items.join(' · ')}`,
      excellent: `Passing evidence plus an independently chosen edge case, a regression test, and the transfer challenge: ${transfer.text}`,
      note: 'Judge the artifact from executable evidence and explanation. A polished output cannot compensate for a hardcoded answer or an untested failure path.',
    })
  }

  if (!blocks.some((block) => block.type === 'unlock-gate')) {
    blocks.push({
      type: 'unlock-gate',
      criteria: [
        `Produce and run the required artifact: ${contract.proof}`,
        `Diagnose and repair the broken case: ${debug.symptom}`,
        `Confirm every observable check: ${verification.items.join(' · ')}`,
        `Complete the transfer without copying the worked example: ${transfer.text}`,
      ],
    })
  }


  const gate = requiredBlock(blocks, 'unlock-gate', slug)
  if (!gate.criteria.some((criterion) => /test|prove|output|evidence|demonstrate/i.test(criterion))) {
    gate.criteria[0] = `Observable evidence — ${gate.criteria[0]}`
  }
}

writeFileSync(lessonPath, `${JSON.stringify(lessons, null, 2)}\n`)
console.log(`Upgraded ${Object.keys(lessons).length} Programming Fundamentals lessons with mastery-loop evidence.`)

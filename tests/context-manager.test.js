'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const context = require('../context-manager.js');

function turn(prompt, answer) {
    return [
        { role: 'user', content: prompt },
        { role: 'assistant', content: answer }
    ];
}

test('estimates image payloads separately from encoded image data', function () {
    const message = {
        role: 'user',
        content: 'Describe this',
        image: { mime: 'image/png', data: 'A'.repeat(100000) }
    };

    assert.equal(
        context.estimateMessageTokens(message),
        Math.ceil(message.content.length / 2.5) + 1536 + 12
    );
});

test('marks large conversation context for summarization', function () {
    const messages = turn('x'.repeat(50000), 'answer');

    assert.ok(
        context.estimateContextTokens('', messages, 'follow-up', null) >
            context.SUMMARY_TRIGGER_TOKENS
    );
});

test('selects complete oldest turns and preserves the requested recent turns', function () {
    const messages = turn('old question', 'old answer')
        .concat(turn('middle question', 'middle answer'))
        .concat(turn('recent question', 'recent answer'));

    assert.deepEqual(
        context.selectSummaryBatch(messages, 0, 6000, 2),
        messages.slice(0, 4)
    );
});

test('keeps at least one turn when a single turn exceeds the chunk target', function () {
    const messages = turn('x'.repeat(20000), 'answer')
        .concat(turn('recent question', 'recent answer'));

    assert.deepEqual(
        context.selectSummaryBatch(messages, 0, 100, 2),
        messages.slice(0, 2)
    );
});

test('does not split turns or select already summarized messages', function () {
    const messages = turn('first', 'reply 1')
        .concat(turn('second', 'reply 2'))
        .concat(turn('third', 'reply 3'));

    assert.deepEqual(
        context.selectSummaryBatch(messages, 2, 6000, 2),
        messages.slice(2, 4)
    );
});

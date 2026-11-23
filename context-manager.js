(function (root, factory) {
    const api = factory();
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    } else {
        root.DeepMindContext = api;
    }
}(globalThis, function () {
    'use strict';

    const SUMMARY_TRIGGER_TOKENS = 18000;
    const REQUEST_BUDGET_TOKENS = 24000;
    const SUMMARY_CHUNK_TOKENS = 6000;
    const IMAGE_TOKEN_ESTIMATE = 1536;
    const CHARS_PER_TOKEN_ESTIMATE = 2.5;
    const MESSAGE_OVERHEAD_TOKENS = 12;

    function estimateTextTokens(text) {
        return Math.ceil(String(text || '').length / CHARS_PER_TOKEN_ESTIMATE);
    }

    function estimateMessageTokens(message) {
        const content = Array.isArray(message.content)
            ? message.content.reduce(function (total, part) {
                if (part.type === 'text') return total + estimateTextTokens(part.text);
                if (part.type === 'image_url') return total + IMAGE_TOKEN_ESTIMATE;
                return total;
            }, 0)
            : estimateTextTokens(message.content);
        const imageTokens = message.image ? IMAGE_TOKEN_ESTIMATE : 0;
        return content + imageTokens + MESSAGE_OVERHEAD_TOKENS;
    }

    function estimateContextTokens(summary, messages, prompt, image) {
        let total = estimateTextTokens(prompt) + MESSAGE_OVERHEAD_TOKENS * 2;
        if (image) total += IMAGE_TOKEN_ESTIMATE;
        if (summary) total += estimateTextTokens(summary) + MESSAGE_OVERHEAD_TOKENS;
        return messages.reduce(function (count, message) {
            return count + estimateMessageTokens(message);
        }, total);
    }

    function selectSummaryBatch(messages, startIndex, maxTokens, minimumRecentMessages) {
        const available = messages.length - startIndex;
        const limit = Math.max(0, available - minimumRecentMessages);
        if (limit < 2) return [];

        let tokenCount = 0;
        let endIndex = startIndex;
        while (endIndex + 2 <= startIndex + limit) {
            const pairTokens = estimateMessageTokens(messages[endIndex]) +
                estimateMessageTokens(messages[endIndex + 1]);
            if (endIndex > startIndex && tokenCount + pairTokens > maxTokens) break;
            tokenCount += pairTokens;
            endIndex += 2;
        }
        return messages.slice(startIndex, endIndex);
    }

    return {
        SUMMARY_TRIGGER_TOKENS: SUMMARY_TRIGGER_TOKENS,
        REQUEST_BUDGET_TOKENS: REQUEST_BUDGET_TOKENS,
        SUMMARY_CHUNK_TOKENS: SUMMARY_CHUNK_TOKENS,
        estimateMessageTokens: estimateMessageTokens,
        estimateContextTokens: estimateContextTokens,
        selectSummaryBatch: selectSummaryBatch
    };
}));

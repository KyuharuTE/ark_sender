export function createMessageHandler() {
    function buildMessage(type, content, ...args) {
        switch (type) {
            case 'json':
                return [{
                    type: 'json',
                    data: { data: content }
                }];
            case 'text':
                return [{
                    type: 'text',
                    data: { text: content }
                }];
            default:
                throw new Error('不支持的消息类型');
        }
    }

    return { buildMessage };
}

export function createApiHandler(port) {
    const getBaseUrl = () => `http://127.0.0.1:${port}`;

    async function request(endpoint, data) {
        const response = await fetch(`${getBaseUrl()}/${endpoint}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            throw new Error(`API请求失败: ${endpoint}`);
        }

        return response;
    }

    async function sendGroupMessage(groupId, message) {
        return request('send_group_msg', {
            group_id: groupId,
            message: message
        });
    }

    return {
        request,
        sendGroupMessage
    };
}
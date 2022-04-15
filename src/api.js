async function handleRequest(request, reply) {
    return reply.send({ data: "Hello, World!" });
}

module.exports = {
    handleRequest
};

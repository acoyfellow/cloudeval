default:
	@node ./bin/cloudeval.mjs

init:
	node ./bin/cloudeval.mjs init

doctor:
	node ./bin/cloudeval.mjs doctor

run:
	node ./bin/cloudeval.mjs run

report:
	node ./bin/cloudeval.mjs report

compare:
	node ./bin/cloudeval.mjs compare

mock-run:
	node ./bin/cloudeval.mjs run --dataset agent-quality --models workers-ai/@cf/zai-org/glm-4.7-flash,baseline --mock

mock-chat:
	node ./bin/cloudeval.mjs run --dataset chat-response --models workers-ai/@cf/zai-org/glm-4.7-flash,baseline --mock

serve:
	python3 -m http.server

build:
	rm -rf build/
	mkdir build/
	git ls-tree HEAD --name-only | xargs -I % cp -r % build/
	sed -i '' 's/{{ site.version }}/'`date +"%Y.%m.%d"`'/' build/index.html
.PHONY: build

release: build
	git worktree add -b deploy deploying/ origin/deploy
	- cd deploying/ && \
		git rm -rf . && \
		git clean -fxd && \
		cp -r ../build/* ./ && \
		git add . && \
		git commit -am "Publishing" && \
		git push
	git worktree remove deploying
	git branch -d deploy

release-prod: release
	git tag -f `date +"%Y.%m.%d"`-published
	git tag -f `date +"%Y.%m.%d"` origin/deploy
	git push --tags -f

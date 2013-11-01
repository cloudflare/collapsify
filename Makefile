NAME      := collapsify
VERSION   := $(shell python -c "import json; data = json.load(file('package.json')); print data.get('version')")
ITERATION := 0
REVISION  := $(shell git log -n1 --pretty=format:%h)

TMP_ROOT             := $(shell pwd)/tmp
DEPS_ROOT            := $(TMP_ROOT)/deps
BUILD_ROOT           := $(TMP_ROOT)/build
PACKAGE_ROOT         := $(TMP_ROOT)/packaging
MANIFEST_ROOT        := $(PACKAGE_ROOT)/etc/manifest
MANIFEST_FILE        := $(MANIFEST_ROOT)/$(NAME)
INSTALL_PREFIX       := usr/local
BUILD_DEPS           := nodejs python
DEB_PACKAGE          := $(NAME)_$(VERSION)-$(ITERATION)-${REVISION}_amd64.deb

print-builddeps:
	@echo $(BUILD_DEPS)

$(DEB_PACKAGE): clean
	@echo $VERSION
	mkdir -p $(PACKAGE_ROOT)/$(INSTALL_PREFIX)/$(NAME)

    # manifest:
	mkdir -p $(MANIFEST_ROOT)
	rm -f $(MANIFEST_FILE)
	git log -n1 --pretty='collapsify :: %h :: %an :: %ad :: %ae' >> $(MANIFEST_FILE)

    # statics:
	scp -r -p bin           $(PACKAGE_ROOT)/$(INSTALL_PREFIX)/$(NAME)/.
	scp -r -p lib           $(PACKAGE_ROOT)/$(INSTALL_PREFIX)/$(NAME)/.
	scp -r -p index.js      $(PACKAGE_ROOT)/$(INSTALL_PREFIX)/$(NAME)/.
	scp -r -p package.json  $(PACKAGE_ROOT)/$(INSTALL_PREFIX)/$(NAME)/.

    # add node dependcies
	cd $(PACKAGE_ROOT)/$(INSTALL_PREFIX)/$(NAME)/; npm install

    # build deb package:
	fpm -C $(PACKAGE_ROOT) -s dir -t deb -n $(NAME) -v $(VERSION) \
        --iteration $(ITERATION)-${REVISION} \
        --depends "circus" \
        --depends "nodejs" \
        --deb-user root \
        --deb-group root \
        .

.PHONY: cf-package
cf-package: $(DEB_PACKAGE)

.PHONY: clean-package
clean-package:
	$(RM) -r $(TMP_ROOT)
	$(RM) *.deb

.PHONY: clean
clean: clean-package

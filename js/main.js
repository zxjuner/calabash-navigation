/*! For license information please see main.js.LICENSE.txt */
(()=>{"use strict";var __webpack_modules__={"./src/styles/styles.scss":(__unused_webpack_module,__webpack_exports__,__webpack_require__)=>{eval("__webpack_require__.r(__webpack_exports__);\n// extracted by mini-css-extract-plugin\n\n\n//# sourceURL=webpack://calabash-navigation-site/./src/styles/styles.scss?")},"./src/index.js":(__unused_webpack_module,__webpack_exports__,__webpack_require__)=>{eval("__webpack_require__.r(__webpack_exports__);\n/* harmony import */ var _styles_styles_scss__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./styles/styles.scss */ \"./src/styles/styles.scss\");\n  // 引入 SCSS 文件\n\ndocument.addEventListener('DOMContentLoaded', init);\n\nfunction init() {\n    // 常量定义\n    const ELEMENTS = {\n        topLinkList: document.getElementById('topLinkList'),\n        categoryNav: document.getElementById('categoryNav'),\n        subcategoryNav: document.getElementById('subcategoryNav'),\n        searchInput: document.getElementById('searchInput'),\n        matchedLinks: document.getElementById('matchedLinks'),\n        searchForm: document.getElementById('searchForm'),\n        searchResults: document.getElementById('searchResults'),\n        searchButtonsContainer: document.getElementById('searchButtonsContainer'),\n        addLinkButton: document.getElementById('addLinkButton'),\n        exportLinksButton: document.getElementById('exportLinksButton'),\n        clearLocalStorageButton: document.getElementById('clearLocalStorageButton')\n    };\n\n    ELEMENTS.searchResults.style.display = 'none'; // 默认隐藏搜索结果区域\n\n    let links = [];\n    let categories = new Set();\n    let currentCategory = null;\n    let currentSearchMode = 'site'; // 当前搜索模式，默认为站内搜索\n    let searchEngines = []; // 初始化搜索引擎选项\n    const searchCache = new Map(); // 缓存搜索结果\n    const faviconCache = new Map();\n    const linksTimestampKey = 'linksLastUpdated'; // 时间戳在 localStorage 中的键名\n\n    function getFaviconUrl(url) {\n        if (faviconCache.has(url)) {\n            return faviconCache.get(url);\n        }\n        const cleanUrl = url.match(/(?:https?:\\/\\/)?(?:www\\.)?([^\\/]+)/i)[1];\n        const faviconUrl = `https://favicon.im/${encodeURIComponent(cleanUrl)}?larger=true`;\n        faviconCache.set(url, faviconUrl);\n        return faviconUrl;\n    }\n\n    // 初始化，从 localStorage 加载已保存的链接\n    checkForUpdates().then(() => {\n        links = loadLinksFromLocalStorage();\n        categories = new Set(links.map(link => link.category));\n        renderInitialUI();\n    });\n\n    ELEMENTS.searchForm.addEventListener('submit', performSearch);\n    ELEMENTS.searchInput.addEventListener('input', debounce(performSearch, 300));\n\n    // 添加新链接功能\n    ELEMENTS.addLinkButton.addEventListener('click', openAddLinkModal);\n    document.getElementById('addLinkForm').addEventListener('submit', handleAddLink);\n\n    // 导出链接功能\n    ELEMENTS.exportLinksButton.addEventListener('click', exportLinksAsJson);\n\n    // 清除 LocalStorage\n    ELEMENTS.clearLocalStorageButton.addEventListener('click', clearLocalStorage);\n\n    // 从 search_engines.json 文件加载搜索引擎\n    fetch('./json/search_engines.json')\n        .then(response => response.json())\n        .then(data => {\n            searchEngines = data.engines; // 加载搜索引擎选项\n            renderSearchButtons(); // 渲染搜索引擎按钮\n        })\n        .catch(handleError);\n\n    // 检查是否有新的 links.json 数据\n    function checkForUpdates() {\n        return fetch('./json/links.json')\n            .then(response => response.json())\n            .then(data => {\n                const remoteTimestamp = new Date(data.lastUpdated).getTime(); // 假设 links.json 包含 lastUpdated 字段\n                const localTimestamp = parseInt(localStorage.getItem(linksTimestampKey), 10) || 0;\n\n                if (remoteTimestamp > localTimestamp) {\n                    // 如果远程的时间戳更新了，更新 localStorage 数据\n                    links = data.links;\n                    categories = new Set(links.map(link => link.category));\n                    saveLinksToLocalStorage();\n                    localStorage.setItem(linksTimestampKey, remoteTimestamp.toString());\n                    renderInitialUI(); // 重新渲染 UI\n                }\n            })\n            .catch(handleError);\n    }\n\n    function loadLinksFromLocalStorage() {\n        const storedLinks = localStorage.getItem('links');\n        let links = storedLinks ? JSON.parse(storedLinks) : [];\n    \n        // 遍历链接，处理空的 category 和 subcategory\n        links = links.map(link => {\n            return {\n                ...link,\n                category: link.category || '其他',     // 如果 category 为空，则赋值为 \"其他\"\n                subcategory: link.subcategory || '其他'  // 如果 subcategory 为空，则赋值为 \"其他\"\n            };\n        });\n    \n        return links;\n    }\n    \n\n    function saveLinksToLocalStorage() {\n        localStorage.setItem('links', JSON.stringify(links));\n    }\n\n    function openAddLinkModal() {\n        const modal = new bootstrap.Modal(document.getElementById('addLinkModal'));\n        modal.show();\n    }\n\n    function handleAddLink(event) {\n        event.preventDefault();\n\n        const linkName = document.getElementById('linkName').value;\n        const linkUrl = document.getElementById('linkUrl').value;\n        const linkCategory = document.getElementById('linkCategory').value;\n        const linkSubcategory = document.getElementById('linkSubcategory').value;\n        const linkDescription = document.getElementById('linkDescription').value;\n\n        const newLink = {\n            id: Date.now(), // 使用时间戳作为唯一标识符\n            name: linkName,\n            url: linkUrl,\n            category: linkCategory,\n            subcategory: linkSubcategory,\n            description: linkDescription,\n        };\n\n        links.push(newLink);\n        saveLinksToLocalStorage();\n        categories.add(linkCategory);\n        renderInitialUI();\n\n        const modal = bootstrap.Modal.getInstance(document.getElementById('addLinkModal'));\n        modal.hide();\n    }\n\n    function exportLinksAsJson() {\n        const dataStr = JSON.stringify({ links }, null, 2);\n        const blob = new Blob([dataStr], { type: 'application/json' });\n        const url = URL.createObjectURL(blob);\n\n        const a = document.createElement('a');\n        a.href = url;\n        a.download = 'links.json';\n        document.body.appendChild(a);\n        a.click();\n        document.body.removeChild(a);\n\n        URL.revokeObjectURL(url);\n    }\n\n    // 清除 localstorage\n    function clearLocalStorage() {\n        localStorage.clear();\n        location.reload();\n    }\n\n    // 切换搜索模式按钮\n    function renderSearchButtons() {\n        ELEMENTS.searchButtonsContainer.innerHTML = '';\n        searchEngines.forEach(engine => {\n            const button = createElement('button', 'search-engine-button', engine.name);\n            button.id = `${engine.id}Search`; // 使用 id 生成按钮 ID\n            button.addEventListener('click', () => setSearchMode(engine));\n            ELEMENTS.searchButtonsContainer.appendChild(button);\n        });\n        updateSearchButtons();\n    }\n    \n    // 设置搜索框图标\n    function updateSearchBoxIcon(engine) {\n        const icon = engine.icon || 'https://dummyimage.com/40x40&text=?'; // 如果没有图标则使用备用\n        const searchBoxIcon = document.getElementById('searchBoxIcon');\n        searchBoxIcon.src = icon; // 更新图标的 src\n    }\n    \n    function setSearchMode(engine) {\n        currentSearchMode = engine.id;\n        updateSearchButtons();\n        updateSearchBoxIcon(engine); // 更新搜索框图标\n        clearSearchResults();\n    }\n\n    function updateSearchButtons() {\n        const buttons = ELEMENTS.searchButtonsContainer.querySelectorAll('button');\n        buttons.forEach(button => {\n            button.classList.remove('active-search-option');\n            if (button.id === `${currentSearchMode}Search`) {\n                button.classList.add('active-search-option');\n            }\n        });\n    }\n\n    function renderInitialUI() {\n        renderCategoryNav(); // 渲染一级分类导航\n        if (categories.size > 0) {\n            currentCategory = Array.from(categories)[0]; // 默认选中第一个分类\n            updateCategorySelection();\n            renderSubcategoryNav(); // 渲染子分类和链接\n        }\n        updateTopLinks(); // 页面加载时更新 Top Clicked Links\n    }\n\n    function renderCategoryNav() {\n        ELEMENTS.categoryNav.innerHTML = '';\n        const fragment = document.createDocumentFragment();\n        categories.forEach(category => {\n            const li = createNavItem(category, handleCategoryClick);\n            fragment.appendChild(li);\n        });\n        ELEMENTS.categoryNav.appendChild(fragment);\n    }\n\n    function handleCategoryClick(category) {\n        currentCategory = category; // 更新当前分类\n        updateCategorySelection();\n        renderSubcategoryNav(); // 重新渲染子分类和链接\n    }\n\n    function createNavItem(category, clickHandler) {\n        const li = createElement('li', 'category-nav-item');\n        const a = createElement('a', '', category);\n        a.addEventListener('click', () => clickHandler(category));\n        li.appendChild(a);\n        return li;\n    }\n\n    function updateCategorySelection() {\n        ELEMENTS.categoryNav.querySelectorAll('li').forEach(item => {\n            item.classList.toggle('selected', item.firstChild.textContent === currentCategory);\n        });\n    }\n\n    function renderSubcategoryNav() {\n        ELEMENTS.subcategoryNav.innerHTML = '';\n        const fragment = document.createDocumentFragment();\n        const subcategories = [...new Set(links.filter(link => link.category === currentCategory).map(link => link.subcategory))];\n\n        subcategories.forEach(subcategory => {\n            const row = createElement('div', 'row subcategory-row');\n            const subcategoryItem = createElement('div', 'subcategory-nav-item col-md-2', subcategory);\n            const linksContainer = createLinksContainerForSubcategory(subcategory);\n\n            row.appendChild(subcategoryItem);\n            row.appendChild(linksContainer);\n            fragment.appendChild(row);\n        });\n\n        ELEMENTS.subcategoryNav.appendChild(fragment);\n    }\n\n    function createLinksContainerForSubcategory(subcategory) {\n        const linksContainer = createElement('div', 'links-container col-md-10');\n        const linksItems = createElement('ul', 'links-items row flex-wrap');\n\n        links.filter(linkData => linkData.category === currentCategory && linkData.subcategory === subcategory)\n            .forEach(linkData => {\n                const linkElement = createLinkElement(linkData);\n                linksContainer.appendChild(linksItems);\n                linksItems.appendChild(linkElement);\n            });\n\n        return linksContainer;\n    }\n\n    function createLinkElement(linkData, showDescription = true) {\n        const linkItem = createElement('li', 'link-item col');\n        \n        // 创建超链接，并让整个卡片成为可点击区域\n        const cardLink = createElement('a', 'card-link');\n        cardLink.href = linkData.url;\n        cardLink.setAttribute('data-id', linkData.id);\n        cardLink.addEventListener('click', function (event) {\n            event.preventDefault();\n            recordClick(linkData.id);\n            window.open(linkData.url, '_blank');\n            updateTopLinks();\n        });\n    \n        const card = createElement('div', 'card');\n        const cardBody = createElement('div', 'card-body');\n    \n        // 创建 favicon 图标和名称\n        const faviconImg = createFaviconImage(linkData.url, linkData.name);\n        cardBody.appendChild(faviconImg);\n    \n        const cardName = createElement('p', 'card-text link-name', linkData.name);\n        cardBody.appendChild(cardName);\n    \n        // 添加 description\n        if (showDescription) {\n            const descriptionText = linkData.description ? linkData.description : '&nbsp;';\n            const description = createElement('p', 'card-text description');\n            description.innerHTML = descriptionText; // 使用 innerHTML 来支持 &nbsp;\n            cardBody.appendChild(description);\n        }        \n    \n        card.appendChild(cardBody);\n        cardLink.appendChild(card); // 将卡片放入链接\n        linkItem.appendChild(cardLink); // 将链接放入列表项\n    \n        return linkItem;\n    }\n   \n\n    function createFaviconImage(url, name) {\n        const img = document.createElement('img');\n        img.src = getFaviconUrl(url); // 直接设置 src 以加载图标\n        img.alt = `${name} icon`;\n        img.className = 'favicon';\n\n        img.onerror = () => {\n            img.src = 'https://dummyimage.com/64x64&text=logo'; // 设置备用图标\n        };\n\n        return img;\n    }\n\n    function recordClick(id) {\n        let clicks = parseInt(localStorage.getItem(`linkClicks_${id}`)) || 0;\n        clicks += 1;\n        localStorage.setItem(`linkClicks_${id}`, clicks);\n    }\n\n    function updateTopLinks() {\n        const topLinks = links\n            .map(linkData => ({ ...linkData, clicks: parseInt(localStorage.getItem(`linkClicks_${linkData.id}`)) || 0 }))\n            .filter(item => item.clicks > 0)\n            .sort((a, b) => b.clicks - a.clicks)\n            .slice(0, 5);\n\n        ELEMENTS.topLinkList.innerHTML = '';\n        const fragment = document.createDocumentFragment();\n        topLinks.forEach(item => {\n            const linkElement = createLinkElement(item); // 使用新的链接创建函数\n            fragment.appendChild(linkElement);\n        });\n        ELEMENTS.topLinkList.appendChild(fragment);\n        ELEMENTS.topLinkList.parentElement.style.display = topLinks.length > 0 ? 'block' : 'none';\n    }\n\n    function performSearch(event) {\n        if (event) {\n            event.preventDefault();\n        }\n        const searchTerm = ELEMENTS.searchInput.value.toLowerCase().trim();\n        ELEMENTS.matchedLinks.innerHTML = '';\n    \n        if (!searchTerm) {\n            ELEMENTS.searchInput.placeholder = '请输入搜索内容...';\n            return;\n        }\n    \n        if (event && event.type === 'submit') {  // 确保是点击搜索按钮或提交表单时进行搜索\n            if (currentSearchMode === 'site') {\n                if (searchCache.has(searchTerm)) {\n                    renderSearchResults(searchCache.get(searchTerm));\n                    return;\n                }\n    \n                const results = links.filter(link =>\n                    (link.name && link.name.toLowerCase().includes(searchTerm)) ||\n                    (link.url && link.url.toLowerCase().includes(searchTerm)) ||\n                    (link.description && link.description.toLowerCase().includes(searchTerm))\n                );\n    \n                searchCache.set(searchTerm, results); // 缓存结果\n                renderSearchResults(results);\n            } else {\n                // 使用选定的搜索引擎进行搜索\n                const searchEngine = searchEngines.find(engine => engine.id === currentSearchMode);\n                if (searchEngine) {\n                    window.open(`${searchEngine.url}${encodeURIComponent(searchTerm)}`, '_blank');\n                }\n            }\n        }\n    }\n\n    function clearSearchResults() {\n        ELEMENTS.matchedLinks.innerHTML = ''; // 清空搜索结果\n        ELEMENTS.searchResults.style.display = 'none'; // 隐藏搜索结果区域\n    }\n\n    function renderSearchResults(results) {\n        const container = createElement('div', 'row justify-content-center search-results-container');\n        results.forEach(link => {\n            const linkElement = createLinkElement(link);\n            container.appendChild(linkElement);\n        });\n\n        ELEMENTS.matchedLinks.innerHTML = '';\n        ELEMENTS.matchedLinks.appendChild(container);\n        ELEMENTS.searchResults.style.display = results.length > 0 ? 'block' : 'none';\n    }\n\n    function createElement(tag, className = '', textContent = '') {\n        const element = document.createElement(tag);\n        if (className) element.className = className;\n        if (textContent) element.textContent = textContent;\n        return element;\n    }\n\n    function debounce(func, delay) {\n        let timeout;\n        return function (...args) {\n            clearTimeout(timeout);\n            timeout = setTimeout(() => func.apply(this, args), delay);\n        };\n    }\n\n    function handleError(error) {\n        console.error('发生错误:', error);\n        alert('加载数据时发生错误，请稍后再试。');\n    }\n}\n\n\n//# sourceURL=webpack://calabash-navigation-site/./src/index.js?")}},__webpack_module_cache__={};function __webpack_require__(n){var e=__webpack_module_cache__[n];if(void 0!==e)return e.exports;var t=__webpack_module_cache__[n]={exports:{}};return __webpack_modules__[n](t,t.exports,__webpack_require__),t.exports}__webpack_require__.r=n=>{"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(n,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(n,"__esModule",{value:!0})};var __webpack_exports__=__webpack_require__("./src/index.js")})();
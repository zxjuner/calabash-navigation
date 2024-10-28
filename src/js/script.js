document.addEventListener('DOMContentLoaded', init);

function init() {
    // 常量定义
    const ELEMENTS = {
        topLinkList: document.getElementById('topLinkList'),
        topLinkListContainer: document.getElementById('topLinkListContainer'),
        categoryNav: document.getElementById('categoryNav'),
        subcategoryNav: document.getElementById('subcategoryNav'),
        searchInput: document.getElementById('searchInput'),
        matchedLinks: document.getElementById('matchedLinks'),
        searchForm: document.getElementById('searchForm'),
        searchResults: document.getElementById('searchResults'),
        searchButtonsContainer: document.getElementById('searchButtonsContainer'),
        addLinkButton: document.getElementById('addLinkButton'),
        exportLinksButton: document.getElementById('exportLinksButton'),
        clearLocalStorageButton: document.getElementById('clearLocalStorageButton')
    };

    ELEMENTS.searchResults.style.display = 'none'; // 默认隐藏搜索结果区域

    let links = [];
    let categories = new Set();
    let currentCategory = null;
    let currentSearchMode = 'site'; // 当前搜索模式，默认为站内搜索
    let searchEngines = []; // 初始化搜索引擎选项
    const searchCache = new Map(); // 缓存搜索结果
    const faviconCache = new Map();
    const linksTimestampKey = 'linksLastUpdated'; // 时间戳在 localStorage 中的键名

    function getFaviconUrl(url) {
        if (faviconCache.has(url)) {
            return faviconCache.get(url);
        }
        const cleanUrl = url.match(/(?:https?:\/\/)?(?:www\.)?([^\/]+)/i)[1];
        const faviconUrl = `https://favicon.im/${encodeURIComponent(cleanUrl)}?larger=true`;
        faviconCache.set(url, faviconUrl);
        return faviconUrl;
    }

    // 初始化，从 localStorage 加载已保存的链接
    checkForUpdates().then(() => {
        links = loadLinksFromLocalStorage();
        categories = new Set(links.map(link => link.category));
        renderInitialUI();
    });

    ELEMENTS.searchForm.addEventListener('submit', performSearch);
    ELEMENTS.searchInput.addEventListener('input', debounce(performSearch, 300));

    // 添加新链接功能
    ELEMENTS.addLinkButton.addEventListener('click', openAddLinkModal);
    document.getElementById('addLinkForm').addEventListener('submit', handleAddLink);

    // 导出链接功能
    ELEMENTS.exportLinksButton.addEventListener('click', exportLinksAsJson);

    // 清除 LocalStorage
    ELEMENTS.clearLocalStorageButton.addEventListener('click', clearLocalStorage);

    // 从 search_engines.json 文件加载搜索引擎
    fetch('./json/search_engines.json')
        .then(response => response.json())
        .then(data => {
            searchEngines = data.engines; // 加载搜索引擎选项

            // 设置默认搜索模式
            if (data.defaultSearchMode) {
                currentSearchMode = data.defaultSearchMode;
            }

            renderSearchButtons(); // 渲染搜索引擎按钮
            updateSearchBoxIcon(currentSearchMode); // 设置搜索框图标为默认搜索引擎的图标
        })
        .catch(handleError);

    // 检查是否有新的 links.json 数据
    function checkForUpdates() {
        return fetch('./json/links.json')
            .then(response => response.json())
            .then(data => {
                const remoteTimestamp = new Date(data.lastUpdated).getTime(); // 假设 links.json 包含 lastUpdated 字段
                const localTimestamp = parseInt(localStorage.getItem(linksTimestampKey), 10) || 0;

                if (remoteTimestamp > localTimestamp) {
                    // 如果远程的时间戳更新了，更新 localStorage 数据
                    links = data.links;
                    categories = new Set(links.map(link => link.category));
                    saveLinksToLocalStorage();
                    localStorage.setItem(linksTimestampKey, remoteTimestamp.toString());
                    renderInitialUI(); // 重新渲染 UI
                }
            })
            .catch(handleError);
    }

    function loadLinksFromLocalStorage() {
        const storedLinks = localStorage.getItem('links');
        let links = storedLinks ? JSON.parse(storedLinks) : [];
    
        // 遍历链接，处理空的 category 和 subcategory
        links = links.map(link => {
            return {
                ...link,
                category: link.category || '其他',     // 如果 category 为空，则赋值为 "其他"
                subcategory: link.subcategory || '其他'  // 如果 subcategory 为空，则赋值为 "其他"
            };
        });
    
        return links;
    }

    function saveLinksToLocalStorage() {
        localStorage.setItem('links', JSON.stringify(links));
    }

    function openAddLinkModal() {
        const modal = new bootstrap.Modal(document.getElementById('addLinkModal'));
        modal.show();
    }

    function handleAddLink(event) {
        event.preventDefault();

        const linkName = document.getElementById('linkName').value;
        const linkUrl = document.getElementById('linkUrl').value;
        const linkCategory = document.getElementById('linkCategory').value;
        const linkSubcategory = document.getElementById('linkSubcategory').value;
        const linkDescription = document.getElementById('linkDescription').value;

        const newLink = {
            id: Date.now(), // 使用时间戳作为唯一标识符
            name: linkName,
            url: linkUrl,
            category: linkCategory,
            subcategory: linkSubcategory,
            description: linkDescription,
        };

        links.push(newLink);
        saveLinksToLocalStorage();
        categories.add(linkCategory);
        renderInitialUI();

        const modal = bootstrap.Modal.getInstance(document.getElementById('addLinkModal'));
        modal.hide();
    }

    function exportLinksAsJson() {
        const lastUpdated = new Date().toISOString();
        const dataStr = JSON.stringify({ lastUpdated, links }, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = 'links.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        URL.revokeObjectURL(url);
    }

    // 清除 localstorage
    function clearLocalStorage() {
        localStorage.clear();
        location.reload();
    }

    // 切换搜索模式按钮
    function renderSearchButtons() {
        ELEMENTS.searchButtonsContainer.innerHTML = '';
        searchEngines.forEach(engine => {
            const button = createElement('button', 'search-engine-button', engine.name);
            button.id = `${engine.id}Search`; // 使用 id 生成按钮 ID
            button.addEventListener('click', () => setSearchMode(engine));
            ELEMENTS.searchButtonsContainer.appendChild(button);
        });
        updateSearchButtons();
    }
    
    function setSearchMode(engine) {
        currentSearchMode = engine.id;
        updateSearchButtons();
        updateSearchBoxIcon(engine.id); // 更新搜索框图标
        clearSearchResults();
    }
    
    // 设置搜索框图标
    function updateSearchBoxIcon(mode) {
        const searchEngine = searchEngines.find(engine => engine.id === mode);
        const icon = (searchEngine && searchEngine.icon) ? searchEngine.icon : 'https://dummyimage.com/40x40&text=logo';
        const searchBoxIcon = document.getElementById('searchBoxIcon');
        searchBoxIcon.src = icon; // 更新图标的 src
    }

    function updateSearchButtons() {
        const buttons = ELEMENTS.searchButtonsContainer.querySelectorAll('button');
        buttons.forEach(button => {
            button.classList.remove('active-search-option');
            if (button.id === `${currentSearchMode}Search`) {
                button.classList.add('active-search-option');
            }
        });
    }

    function renderInitialUI() {
        renderCategoryNav(); // 渲染一级分类导航
        if (categories.size > 0) {
            currentCategory = Array.from(categories)[0]; // 默认选中第一个分类
            updateCategorySelection();
            renderSubcategoryNav(); // 渲染子分类和链接
        }
        updateTopLinks(); // 页面加载时更新 Top Clicked Links
    }

    function renderCategoryNav() {
        ELEMENTS.categoryNav.innerHTML = '';
        const fragment = document.createDocumentFragment();
        categories.forEach(category => {
            const li = createNavItem(category, handleCategoryClick);
            fragment.appendChild(li);
        });
        ELEMENTS.categoryNav.appendChild(fragment);
    }

    function handleCategoryClick(category) {
        currentCategory = category; // 更新当前分类
        updateCategorySelection();
        renderSubcategoryNav(); // 重新渲染子分类和链接
    }

    function createNavItem(category, clickHandler) {
        const li = createElement('li', 'category-nav-item');
        const a = createElement('a', '', category);
        a.addEventListener('click', () => clickHandler(category));
        li.appendChild(a);
        return li;
    }

    function updateCategorySelection() {
        ELEMENTS.categoryNav.querySelectorAll('li').forEach(item => {
            item.classList.toggle('selected', item.firstChild.textContent === currentCategory);
        });
    }

    function renderSubcategoryNav() {
        ELEMENTS.subcategoryNav.innerHTML = '';
        const fragment = document.createDocumentFragment();
        const subcategories = [...new Set(links.filter(link => link.category === currentCategory).map(link => link.subcategory))];

        subcategories.forEach(subcategory => {
            const row = createElement('div', 'row subcategory-row');
            const subcategoryItem = createElement('div', 'subcategory-nav-item col-md-2', subcategory);
            const linksContainer = createLinksContainerForSubcategory(subcategory);

            row.appendChild(subcategoryItem);
            row.appendChild(linksContainer);
            fragment.appendChild(row);
        });

        ELEMENTS.subcategoryNav.appendChild(fragment);
    }

    function createLinksContainerForSubcategory(subcategory) {
        const linksContainer = createElement('div', 'links-container col-md-10');
        const linksItems = createElement('ul', 'links-items row flex-wrap');

        links.filter(linkData => linkData.category === currentCategory && linkData.subcategory === subcategory)
            .forEach(linkData => {
                const linkElement = createLinkElement(linkData);
                linksContainer.appendChild(linksItems);
                linksItems.appendChild(linkElement);
            });

        return linksContainer;
    }

    function createLinkElement(linkData, showDescription = true) {
        const linkItem = createElement('li', 'link-item col');
        
        // 创建超链接，并让整个卡片成为可点击区域
        const cardLink = createElement('a', 'card-link');
        cardLink.href = linkData.url;
        cardLink.setAttribute('data-id', linkData.id);
        cardLink.addEventListener('click', function (event) {
            event.preventDefault();
            recordClick(linkData.id);
            window.open(linkData.url, '_blank');
            updateTopLinks();
        });
    
        const card = createElement('div', 'card');
        const cardBody = createElement('div', 'card-body');
    
        // 创建 favicon 图标和名称
        const faviconImg = createFaviconImage(linkData.url, linkData.name);
        cardBody.appendChild(faviconImg);
    
        const cardName = createElement('p', 'card-text link-name', linkData.name);
        cardBody.appendChild(cardName);
    
        // 添加 description
        if (showDescription) {
            const descriptionText = linkData.description ? linkData.description : '&nbsp;';
            const description = createElement('p', 'card-text description');
            description.innerHTML = descriptionText; // 使用 innerHTML 来支持 &nbsp;
            cardBody.appendChild(description);
        }
    
        card.appendChild(cardBody);
        cardLink.appendChild(card); // 将卡片放入链接
        linkItem.appendChild(cardLink); // 将链接放入列表项
    
        return linkItem;
    }

    function createFaviconImage(url, name) {
        const img = document.createElement('img');
        img.src = getFaviconUrl(url); // 直接设置 src 以加载图标
        img.alt = `${name} icon`;
        img.className = 'favicon';

        img.onerror = () => {
            img.src = 'https://dummyimage.com/64x64&text=logo'; // 设置备用图标
        };

        return img;
    }

    function recordClick(id) {
        let clicks = parseInt(localStorage.getItem(`linkClicks_${id}`)) || 0;
        clicks += 1;
        localStorage.setItem(`linkClicks_${id}`, clicks);
    }

    function updateTopLinks() {
        const topLinks = links
            .map(linkData => ({ ...linkData, clicks: parseInt(localStorage.getItem(`linkClicks_${linkData.id}`)) || 0 }))
            .filter(item => item.clicks > 0)
            .sort((a, b) => b.clicks - a.clicks)
            .slice(0, 10);

        ELEMENTS.topLinkList.innerHTML = '';
        const fragment = document.createDocumentFragment();
        topLinks.forEach(item => {
            const linkElement = createLinkElement(item); // 使用新的链接创建函数
            fragment.appendChild(linkElement);
        });
        ELEMENTS.topLinkList.appendChild(fragment);
        ELEMENTS.topLinkListContainer.style.display = topLinks.length > 0 ? 'flex' : 'none';
    }

    function performSearch(event) {
        if (event) {
            event.preventDefault();
        }
        const searchTerm = ELEMENTS.searchInput.value.toLowerCase().trim();
        ELEMENTS.matchedLinks.innerHTML = '';
    
        if (!searchTerm) {
            ELEMENTS.searchInput.placeholder = '请输入搜索内容...';
            return;
        }
    
        if (event && event.type === 'submit') {  // 确保是点击搜索按钮或提交表单时进行搜索
            if (currentSearchMode === 'site') {
                if (searchCache.has(searchTerm)) {
                    renderSearchResults(searchCache.get(searchTerm));
                    return;
                }
    
                const results = links.filter(link =>
                    (link.name && link.name.toLowerCase().includes(searchTerm)) ||
                    (link.url && link.url.toLowerCase().includes(searchTerm)) ||
                    (link.description && link.description.toLowerCase().includes(searchTerm))
                );
    
                searchCache.set(searchTerm, results); // 缓存结果
                renderSearchResults(results);
            } else {
                // 使用选定的搜索引擎进行搜索
                const searchEngine = searchEngines.find(engine => engine.id === currentSearchMode);
                if (searchEngine) {
                    window.open(`${searchEngine.url}${encodeURIComponent(searchTerm)}`, '_blank');
                }
            }
        }
    }

    function clearSearchResults() {
        ELEMENTS.matchedLinks.innerHTML = ''; // 清空搜索结果
        ELEMENTS.searchResults.style.display = 'none'; // 隐藏搜索结果区域
    }

    function renderSearchResults(results) {
        const container = createElement('div', 'row justify-content-center search-results-container');
        results.forEach(link => {
            const linkElement = createLinkElement(link);
            container.appendChild(linkElement);
        });

        ELEMENTS.matchedLinks.innerHTML = '';
        ELEMENTS.matchedLinks.appendChild(container);
        ELEMENTS.searchResults.style.display = results.length > 0 ? 'block' : 'none';
    }

    function createElement(tag, className = '', textContent = '') {
        const element = document.createElement(tag);
        if (className) element.className = className;
        if (textContent) element.textContent = textContent;
        return element;
    }

    function debounce(func, delay) {
        let timeout;
        return function (...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), delay);
        };
    }

    function handleError(error) {
        console.error('发生错误:', error);
        alert('加载数据时发生错误，请稍后再试。');
    }
}

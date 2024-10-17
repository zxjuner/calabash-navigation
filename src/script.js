document.addEventListener('DOMContentLoaded', init);

function init() {
    // 常量定义
    const ELEMENTS = {
        topLinkList: document.getElementById('topLinkList'),
        categoryNav: document.getElementById('categoryNav'),
        subcategoryNav: document.getElementById('subcategoryNav'),
        searchInput: document.getElementById('searchInput'),
        matchedLinks: document.getElementById('matchedLinks'),
        searchForm: document.getElementById('searchForm'),
        searchResults: document.getElementById('searchResults'),
        searchButtonsContainer: document.getElementById('searchButtonsContainer'),
        addLinkButton: document.getElementById('addLinkButton'),
        exportLinksButton: document.getElementById('exportLinksButton')
    };

    ELEMENTS.searchResults.style.display = 'none'; // 默认隐藏搜索结果区域

    let links = [];
    let categories = new Set();
    let currentCategory = null;
    let currentSearchMode = 'site'; // 当前搜索模式，默认为站内搜索
    let searchEngines = []; // 初始化搜索引擎选项
    const searchCache = new Map(); // 缓存搜索结果
    const faviconCache = new Map();

    function getFaviconUrl(url) {
        if (faviconCache.has(url)) {
            return faviconCache.get(url);
        }
        const cleanUrl = url.match(/(?:https?:\/\/)?(?:www\.)?([^\/]+)/i)[1];
        const faviconUrl = `https://favicon.im/${encodeURIComponent(cleanUrl)}`;
        faviconCache.set(url, faviconUrl);
        return faviconUrl;
    }

    // 初始化，从 localStorage 加载已保存的链接
    links = loadLinksFromLocalStorage();
    categories = new Set(links.map(link => link.category));
    renderInitialUI();

    ELEMENTS.searchForm.addEventListener('submit', performSearch);
    ELEMENTS.searchInput.addEventListener('input', debounce(performSearch, 300));

    // 添加新链接功能
    ELEMENTS.addLinkButton.addEventListener('click', openAddLinkModal);
    document.getElementById('addLinkForm').addEventListener('submit', handleAddLink);

    // 导出链接功能
    ELEMENTS.exportLinksButton.addEventListener('click', exportLinksAsJson);

    // 从 search_engines.json 文件加载搜索引擎
    fetch('search_engines.json')
        .then(response => response.json())
        .then(data => {
            searchEngines = data.engines; // 加载搜索引擎选项
            renderSearchButtons(); // 渲染搜索引擎按钮
        })
        .catch(handleError);

    // 如果 localStorage 中没有链接数据，则从 links.json 加载
    if (links.length === 0) {
        fetchData().then(data => {
            links = data.links; // 将 links.json 文件中的数据加载到 links 数组
            categories = new Set(links.map(link => link.category));
            saveLinksToLocalStorage(); // 将数据保存到 localStorage 中
            renderInitialUI(); // 渲染初始 UI
        }).catch(handleError);
    }

    function loadLinksFromLocalStorage() {
        const storedLinks = localStorage.getItem('links');
        return storedLinks ? JSON.parse(storedLinks) : [];
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
        const dataStr = JSON.stringify({ links }, null, 2);
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
    
    // 设置搜索框图标
    function updateSearchBoxIcon(engine) {
        const icon = engine.icon || 'https://dummyimage.com/20x20&text=?'; // 如果没有图标则使用备用
        const searchBoxIcon = document.getElementById('searchBoxIcon');
        searchBoxIcon.src = icon; // 更新图标的 src
    }
    
    
    function setSearchMode(engine) {
        currentSearchMode = engine.id;
        updateSearchButtons();
        updateSearchBoxIcon(engine); // 更新搜索框图标
        clearSearchResults();
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

    function fetchData() {
        return fetch('links.json')
            .then(response => response.json());
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
            const subcategoryItem = createElement('div', 'subcategory-nav-item col-md-3', subcategory);
            const linksContainer = createLinksContainerForSubcategory(subcategory);

            row.appendChild(subcategoryItem);
            row.appendChild(linksContainer);
            fragment.appendChild(row);
        });

        ELEMENTS.subcategoryNav.appendChild(fragment);
    }

    function createLinksContainerForSubcategory(subcategory) {
        const linksContainer = createElement('div', 'links-container col-md-9');

        links.filter(linkData => linkData.category === currentCategory && linkData.subcategory === subcategory)
            .forEach(linkData => {
                const linkElement = createLinkElement(linkData);
                linksContainer.appendChild(linkElement);
            });

        return linksContainer;
    }

    function createLinkElement(linkData) {
        const a = createElement('a', 'link-item', linkData.name);
        a.href = linkData.url;
        a.setAttribute('data-id', linkData.id);
        a.prepend(createFaviconImage(linkData.url, linkData.name));

        a.addEventListener('click', function (event) {
            event.preventDefault();
            recordClick(linkData.id);
            window.open(linkData.url, '_blank');
            updateTopLinks();
        });

        return a;
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
            .slice(0, 5);

        ELEMENTS.topLinkList.innerHTML = '';
        const fragment = document.createDocumentFragment();
        topLinks.forEach(item => {
            const li = createElement('li');
            const linkElement = createLinkElement(item); // 使用新的链接创建函数
            li.appendChild(linkElement);
            fragment.appendChild(li);
        });
        ELEMENTS.topLinkList.appendChild(fragment);
        ELEMENTS.topLinkList.parentElement.style.display = topLinks.length > 0 ? 'block' : 'none';
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
        alert('加载数据时发生错误，请稍后再试。'); // 友好的错误提示
    }
}

(() => {
  "use strict";

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const asset = name => `assets/${name}`;

  const apps = [
    { id: "computer", name: "我的电脑", icon: "my-computer.png", open: openComputer },
    { id: "documents", name: "我的文档", icon: "my-documents.png", open: openDocuments },
    { id: "recycle", name: "回收站", icon: "recycle-bin.png", open: openRecycle },
    { id: "notepad", name: "记事本", icon: "notepad.png", open: openNotepad },
    { id: "minesweeper", name: "扫雷", icon: "minesweeper.png", open: openMinesweeper },
    { id: "paint", name: "画图", icon: "mspaint.png", open: openPaint },
    { id: "ie", name: "Internet Explorer", icon: "ie6.png", open: openIE },
    { id: "control", name: "控制面板", icon: "control-panel.png", open: openControl }
  ];

  const appMap = Object.fromEntries(apps.map(app => [app.id, app]));
  const windows = new Map();
  let zIndex = 100;
  let sequence = 0;
  let selectedIcon = null;
  let balloonTimer = null;

  setTimeout(() => {
    $("#boot").classList.add("hidden");
    $("#login").classList.remove("hidden");
  }, 1800);

  $("#login-user").addEventListener("click", login);
  $("#restart-button").addEventListener("click", () => location.reload());
  $("#start-button").addEventListener("click", event => {
    event.stopPropagation();
    const menu = $("#start-menu");
    menu.classList.toggle("hidden");
    $("#start-button").classList.toggle("active", !menu.classList.contains("hidden"));
  });

  function login() {
    $("#login").classList.add("hidden");
    $("#desktop").classList.remove("hidden");
    notify("Windows XP", "欢迎回来，Administrator！\n双击桌面图标开始使用。");
  }

  function renderDesktop() {
    const desktop = $("#desktop-icons");
    desktop.innerHTML = "";
    apps.filter(app => app.id !== "control").forEach(app => {
      const button = document.createElement("button");
      button.className = "desktop-icon";
      button.dataset.app = app.id;
      button.innerHTML = `<img src="${asset(app.icon)}" alt=""><span>${app.name}</span>`;
      button.addEventListener("click", event => {
        event.stopPropagation();
        selectedIcon?.classList.remove("selected");
        selectedIcon = button;
        button.classList.add("selected");
      });
      button.addEventListener("dblclick", () => openApp(app.id));
      desktop.appendChild(button);
    });

    const programs = $("#start-programs");
    programs.innerHTML = "";
    apps.slice(3, 7).forEach(app => {
      const button = document.createElement("button");
      button.dataset.app = app.id;
      button.innerHTML = `<img src="${asset(app.icon)}" alt=""> <b>${app.name}</b>`;
      programs.appendChild(button);
    });
    programs.insertAdjacentHTML("beforeend", "<hr><button data-action=\"all-programs\">所有程序 <b>▶</b></button>");
  }

  function openApp(id) {
    closeStartMenu();
    appMap[id]?.open();
  }

  document.addEventListener("click", event => {
    const appButton = event.target.closest("[data-app]");
    const actionButton = event.target.closest("[data-action]");
    if (appButton && !appButton.classList.contains("desktop-icon")) openApp(appButton.dataset.app);
    if (actionButton) handleAction(actionButton.dataset.action);
    if (!event.target.closest("#start-menu") && !event.target.closest("#start-button")) closeStartMenu();
    if (!event.target.closest(".desktop-icon")) {
      selectedIcon?.classList.remove("selected");
      selectedIcon = null;
    }
  });

  function handleAction(action) {
    if (action === "run") openRun();
    if (action === "help") notify("帮助和支持", "双击桌面图标可打开程序。窗口支持拖动、缩放、最小化和最大化。");
    if (action === "logoff") {
      windows.forEach(item => item.close());
      $("#desktop").classList.add("hidden");
      $("#login").classList.remove("hidden");
    }
    if (action === "shutdown") shutdown();
    if (action === "all-programs") notify("所有程序", "常用程序已经固定在开始菜单左侧。");
  }

  function closeStartMenu() {
    $("#start-menu").classList.add("hidden");
    $("#start-button").classList.remove("active");
  }

  function createWindow({ title, icon = "🪟", width = 620, height = 430, resizable = true }) {
    const node = $("#window-template").content.firstElementChild.cloneNode(true);
    const id = `window-${++sequence}`;
    node.id = id;
    node.style.width = `${Math.min(width, innerWidth - 12)}px`;
    node.style.height = `${Math.min(height, innerHeight - 38)}px`;
    node.style.left = `${Math.max(4, (innerWidth - Math.min(width, innerWidth - 12)) / 2 + (sequence % 5) * 18 - 35)}px`;
    node.style.top = `${Math.max(4, (innerHeight - Math.min(height, innerHeight - 38)) / 2 + (sequence % 5) * 15 - 55)}px`;
    $(".window-title", node).textContent = title;
    $(".window-icon", node).innerHTML = icon;
    if (!resizable) $(".resize-handle", node).remove();
    $("#windows-layer").appendChild(node);

    const task = document.createElement("button");
    task.className = "task-button";
    task.innerHTML = `${icon} ${title}`;
    $("#task-buttons").appendChild(task);

    let minimized = false;
    let maximized = false;
    let savedRect = null;
    const api = {
      id, el: node, body: $(".window-body", node), task,
      focus() {
        windows.forEach(win => { win.el.classList.add("inactive"); win.task.classList.remove("active"); });
        node.classList.remove("inactive");
        task.classList.add("active");
        node.style.zIndex = ++zIndex;
      },
      close() { node.remove(); task.remove(); windows.delete(id); },
      minimize() { node.classList.add("hidden"); minimized = true; task.classList.remove("active"); },
      restore() { node.classList.remove("hidden"); minimized = false; api.focus(); },
      setTitle(value) { $(".window-title", node).textContent = value; task.innerHTML = `${icon} ${value}`; }
    };
    windows.set(id, api);
    api.focus();

    node.addEventListener("pointerdown", () => api.focus());
    task.addEventListener("click", () => minimized ? api.restore() : node.classList.contains("inactive") ? api.focus() : api.minimize());
    $("[data-win=close]", node).addEventListener("click", event => { event.stopPropagation(); api.close(); });
    $("[data-win=min]", node).addEventListener("click", event => { event.stopPropagation(); api.minimize(); });
    $("[data-win=max]", node).addEventListener("click", event => { event.stopPropagation(); toggleMaximize(); });
    $(".titlebar", node).addEventListener("dblclick", toggleMaximize);

    function toggleMaximize() {
      if (!resizable) return;
      if (!maximized) {
        savedRect = { left: node.style.left, top: node.style.top, width: node.style.width, height: node.style.height };
        node.classList.add("maximized");
      } else {
        node.classList.remove("maximized");
        Object.assign(node.style, savedRect);
      }
      maximized = !maximized;
    }

    makeDraggable(node, $(".titlebar", node), () => maximized);
    if (resizable) makeResizable(node, $(".resize-handle", node));
    return api;
  }

  function makeDraggable(node, handle, locked) {
    handle.addEventListener("pointerdown", event => {
      if (event.target.closest("button") || locked()) return;
      const startX = event.clientX, startY = event.clientY, left = node.offsetLeft, top = node.offsetTop;
      handle.setPointerCapture(event.pointerId);
      const move = e => {
        node.style.left = `${Math.min(innerWidth - 80, Math.max(-node.offsetWidth + 80, left + e.clientX - startX))}px`;
        node.style.top = `${Math.min(innerHeight - 60, Math.max(0, top + e.clientY - startY))}px`;
      };
      const up = () => { handle.removeEventListener("pointermove", move); handle.removeEventListener("pointerup", up); };
      handle.addEventListener("pointermove", move);
      handle.addEventListener("pointerup", up);
    });
  }

  function makeResizable(node, handle) {
    handle.addEventListener("pointerdown", event => {
      event.stopPropagation();
      const startX = event.clientX, startY = event.clientY, width = node.offsetWidth, height = node.offsetHeight;
      handle.setPointerCapture(event.pointerId);
      const move = e => {
        node.style.width = `${Math.max(280, Math.min(innerWidth - node.offsetLeft, width + e.clientX - startX))}px`;
        node.style.height = `${Math.max(180, Math.min(innerHeight - 31 - node.offsetTop, height + e.clientY - startY))}px`;
      };
      const up = () => { handle.removeEventListener("pointermove", move); handle.removeEventListener("pointerup", up); };
      handle.addEventListener("pointermove", move);
      handle.addEventListener("pointerup", up);
    });
  }

  function explorerWindow(title, icon, files, sideTitle, sideText) {
    const win = createWindow({ title, icon: `<img src="${asset(icon)}" width="16" height="16" alt="">`, width: 680, height: 440 });
    win.body.innerHTML = `<div class="explorer"><div class="menu-bar"><span>文件(F)</span><span>编辑(E)</span><span>查看(V)</span><span>收藏(A)</span><span>工具(T)</span><span>帮助(H)</span></div><div class="toolbar"><button>← 后退</button><button>→ 前进</button><button>🔍 搜索</button><button>📁 文件夹</button></div><div class="explorer-main"><aside class="explorer-side"><h3>${sideTitle}</h3><p>${sideText}</p></aside><div class="file-grid"></div></div><div class="status-bar">${files.length} 个对象</div></div>`;
    const grid = $(".file-grid", win.body);
    files.forEach(file => {
      const button = document.createElement("button");
      button.className = "file-item";
      button.innerHTML = `<img src="${asset(file.icon)}" alt=""><span>${file.name}</span>`;
      if (file.open) button.addEventListener("dblclick", file.open);
      grid.appendChild(button);
    });
    return win;
  }

  function openComputer() {
    explorerWindow("我的电脑", "my-computer.png", [
      { name: "本地磁盘 (C:)", icon: "my-computer.png", open: openDocuments },
      { name: "本地磁盘 (D:)", icon: "my-computer.png", open: () => notify("本地磁盘 (D:)", "这里保存着 2005 年的游戏和电影。") },
      { name: "3½ 软盘 (A:)", icon: "my-computer.png", open: () => notify("A:", "请将磁盘插入驱动器 A:。") },
      { name: "DVD 驱动器 (E:)", icon: "my-computer.png", open: () => notify("E:", "驱动器中没有光盘。") }
    ], "系统任务", "查看系统信息\n添加或删除程序\n更改一个设置");
  }

  function openDocuments() {
    explorerWindow("我的文档", "my-documents.png", [
      { name: "我的图片", icon: "my-documents.png", open: () => notify("我的图片", "文件夹是空的。") },
      { name: "我的音乐", icon: "my-documents.png", open: () => notify("我的音乐", "童话.mp3\n江南.mp3\n十年.mp3") },
      { name: "欢迎.txt", icon: "notepad.png", open: () => openNotepad("欢迎使用 Windows XP 怀旧桌面！\n\n这里可以打开程序、拖动窗口、玩扫雷并在画图中涂鸦。", "欢迎.txt") },
      { name: "心情日记.txt", icon: "notepad.png", open: () => openNotepad("2005年7月17日 晴\n\n今天申请了新的 QQ 号，晚上准备去网吧。", "心情日记.txt") }
    ], "文件和文件夹任务", "新建一个文件夹\n将这个文件夹发布到 Web\n共享此文件夹");
  }

  function openRecycle() {
    const key = "xp-clone-trash";
    const defaults = ["聊天记录.txt", "旧照片.bmp", "作业最终版.doc"];
    let items = JSON.parse(localStorage.getItem(key) || JSON.stringify(defaults));
    const win = createWindow({ title: "回收站", icon: `<img src="${asset("recycle-bin.png")}" width="16" alt="">`, width: 590, height: 390 });
    const render = () => {
      win.body.innerHTML = `<div class="explorer"><div class="menu-bar"><span>文件(F)</span><span>编辑(E)</span><span>查看(V)</span><span>帮助(H)</span></div><div class="toolbar"><button data-empty>清空回收站</button><button data-restore>还原选中项</button></div><div class="file-grid"></div><div class="status-bar">${items.length} 个对象</div></div>`;
      const grid = $(".file-grid", win.body);
      items.forEach((name, index) => {
        const button = document.createElement("button");
        button.className = "file-item";
        button.dataset.index = index;
        button.innerHTML = `<img src="${asset("notepad.png")}" alt=""><span>${name}</span>`;
        button.addEventListener("click", () => { $$(".file-item", grid).forEach(x => x.classList.remove("selected")); button.classList.add("selected"); });
        grid.appendChild(button);
      });
      $("[data-empty]", win.body).addEventListener("click", () => { items = []; localStorage.setItem(key, "[]"); render(); });
      $("[data-restore]", win.body).addEventListener("click", () => {
        const selected = $(".file-item.selected", grid);
        if (!selected) return notify("回收站", "请先选择一个文件。");
        const name = items.splice(Number(selected.dataset.index), 1)[0];
        localStorage.setItem(key, JSON.stringify(items));
        notify("回收站", `已还原 ${name}`);
        render();
      });
    };
    render();
  }

  function openNotepad(content, fileName = "无标题") {
    const win = createWindow({ title: `${fileName} - 记事本`, icon: `<img src="${asset("notepad.png")}" width="16" alt="">`, width: 650, height: 450 });
    const saved = content ?? localStorage.getItem("xp-clone-note") ?? "";
    win.body.innerHTML = `<div class="menu-bar"><span data-save>文件(F)</span><span>编辑(E)</span><span>格式(O)</span><span>查看(V)</span><span>帮助(H)</span></div><textarea class="notepad" spellcheck="false"></textarea>`;
    const area = $("textarea", win.body);
    area.value = saved;
    $("[data-save]", win.body).addEventListener("click", () => { localStorage.setItem("xp-clone-note", area.value); notify("记事本", "文本已保存到浏览器本地存储。"); });
    area.focus();
  }

  function openMinesweeper() {
    const win = createWindow({ title: "扫雷", icon: `<img src="${asset("minesweeper.png")}" width="16" alt="">`, width: 286, height: 365, resizable: false });
    let board = [], opened = 0, gameOver = false, started = Date.now(), timer;
    win.body.innerHTML = `<div class="menu-bar"><span>游戏(G)</span><span>帮助(H)</span></div><div class="mine-wrap"><div class="mine-head"><span class="mine-count">010</span><button class="mine-reset">🙂</button><span class="mine-time">000</span></div><div class="mine-grid"></div></div>`;
    const grid = $(".mine-grid", win.body);
    const reset = () => {
      clearInterval(timer); grid.innerHTML = ""; opened = 0; gameOver = false; started = Date.now();
      board = Array.from({ length: 81 }, (_, i) => ({ mine: i < 10, open: false, flag: false }));
      board.sort(() => Math.random() - .5);
      board.forEach((cell, index) => {
        const button = document.createElement("button"); button.className = "mine-cell";
        button.addEventListener("click", () => reveal(index));
        button.addEventListener("contextmenu", event => { event.preventDefault(); if (!cell.open && !gameOver) { cell.flag = !cell.flag; button.textContent = cell.flag ? "⚑" : ""; button.classList.toggle("flagged", cell.flag); } });
        grid.appendChild(button);
      });
      $(".mine-reset", win.body).textContent = "🙂";
      $(".mine-time", win.body).textContent = "000";
      timer = setInterval(() => $(".mine-time", win.body).textContent = String(Math.min(999, Math.floor((Date.now() - started) / 1000))).padStart(3, "0"), 1000);
    };
    const neighbors = index => {
      const row = Math.floor(index / 9), col = index % 9, result = [];
      for (let y = -1; y <= 1; y++) for (let x = -1; x <= 1; x++) {
        const r = row + y, c = col + x; if ((x || y) && r >= 0 && r < 9 && c >= 0 && c < 9) result.push(r * 9 + c);
      }
      return result;
    };
    const reveal = index => {
      const cell = board[index]; if (gameOver || cell.open || cell.flag) return;
      cell.open = true; opened++; const button = grid.children[index]; button.classList.add("open");
      if (cell.mine) {
        button.textContent = "💣"; gameOver = true; clearInterval(timer); $(".mine-reset", win.body).textContent = "😵";
        board.forEach((item, i) => { if (item.mine) { grid.children[i].textContent = "💣"; grid.children[i].classList.add("open"); } }); return;
      }
      const count = neighbors(index).filter(i => board[i].mine).length;
      if (count) { button.textContent = count; button.style.color = ["","blue","green","red","navy","maroon","teal","black","gray"][count]; }
      else neighbors(index).forEach(reveal);
      if (opened === 71) { gameOver = true; clearInterval(timer); $(".mine-reset", win.body).textContent = "😎"; notify("扫雷", "恭喜，你赢了！"); }
    };
    $(".mine-reset", win.body).addEventListener("click", reset);
    const oldClose = win.close; win.close = () => { clearInterval(timer); oldClose(); };
    reset();
  }

  function openPaint() {
    const win = createWindow({ title: "画图", icon: `<img src="${asset("mspaint.png")}" width="16" alt="">`, width: 720, height: 500 });
    win.body.innerHTML = `<div class="paint-app"><div class="menu-bar"><span>文件(F)</span><span>编辑(E)</span><span>查看(V)</span><span>图像(I)</span><span>颜色(C)</span><span>帮助(H)</span></div><div class="toolbar"><button data-clear>新建</button><button class="swatch" data-color="#000000" style="background:#000"></button><button class="swatch" data-color="#e02020" style="background:#e02020"></button><button class="swatch" data-color="#1565c0" style="background:#1565c0"></button><button class="swatch" data-color="#1c8b35" style="background:#1c8b35"></button><label>粗细 <input type="range" min="1" max="16" value="3" data-size></label></div><div class="paint-canvas-wrap"><canvas class="paint-canvas" width="900" height="560"></canvas></div></div>`;
    const canvas = $("canvas", win.body), ctx = canvas.getContext("2d"); let drawing = false, color = "#000", size = 3;
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    const point = event => { const rect = canvas.getBoundingClientRect(); return { x: (event.clientX - rect.left) * canvas.width / rect.width, y: (event.clientY - rect.top) * canvas.height / rect.height }; };
    canvas.addEventListener("pointerdown", event => { drawing = true; const p = point(event); ctx.beginPath(); ctx.moveTo(p.x, p.y); canvas.setPointerCapture(event.pointerId); });
    canvas.addEventListener("pointermove", event => { if (!drawing) return; const p = point(event); ctx.strokeStyle = color; ctx.lineWidth = size; ctx.lineTo(p.x, p.y); ctx.stroke(); });
    canvas.addEventListener("pointerup", () => drawing = false);
    $$("[data-color]", win.body).forEach(button => button.addEventListener("click", () => color = button.dataset.color));
    $("[data-size]", win.body).addEventListener("input", event => size = Number(event.target.value));
    $("[data-clear]", win.body).addEventListener("click", () => ctx.clearRect(0, 0, canvas.width, canvas.height));
  }

  function openIE() {
    const win = createWindow({ title: "Microsoft Internet Explorer", icon: `<img src="${asset("ie6.png")}" width="16" alt="">`, width: 760, height: 510 });
    win.body.innerHTML = `<div class="explorer"><div class="menu-bar"><span>文件(F)</span><span>编辑(E)</span><span>查看(V)</span><span>收藏(A)</span><span>工具(T)</span><span>帮助(H)</span></div><div class="toolbar"><button>← 后退</button><button>→ 前进</button><button>⟳ 刷新</button><label style="flex:1;display:flex;align-items:center;gap:5px">地址 <input value="http://www.hao123.com" style="flex:1;height:24px;user-select:text"></label><button data-go>转到</button></div><div style="flex:1;background:#fff;padding:28px;overflow:auto;user-select:text"><h1 style="color:#17468d">hao123 网址之家</h1><p>百度　新浪　搜狐　网易　腾讯　人民网</p><hr><h3>常用网站</h3><p>新闻　音乐　游戏　聊天　邮箱　软件下载</p><p style="margin-top:50px;color:#777">这是离线怀旧页面，不会打开真实的外部网站。</p></div><div class="status-bar">完成</div></div>`;
    $("[data-go]", win.body).addEventListener("click", () => notify("Internet Explorer", "此复刻版处于离线模式。"));
  }

  function openControl() {
    explorerWindow("控制面板", "control-panel.png", [
      { name: "显示", icon: "control-panel.png", open: openDisplay },
      { name: "鼠标", icon: "control-panel.png", open: () => notify("鼠标", "鼠标工作正常。") },
      { name: "声音和音频设备", icon: "control-panel.png", open: () => notify("声音", "音量：75%") },
      { name: "日期和时间", icon: "control-panel.png", open: () => notify("日期和时间", new Date().toLocaleString("zh-CN")) }
    ], "控制面板", "选择一个类别或双击图标更改计算机设置。");
  }

  function openDisplay() {
    const win = createWindow({ title: "显示 属性", icon: "🖥️", width: 430, height: 350, resizable: false });
    win.body.innerHTML = `<div class="dialog"><h3>桌面背景</h3><p>选择桌面的显示方式：</p><div class="dialog-row"><button class="xp-button" data-fit>填充</button><button class="xp-button" data-center>居中</button></div><p>当前壁纸：Bliss</p><div class="dialog-actions"><button class="xp-button" data-ok>确定</button><button class="xp-button" data-cancel>取消</button></div></div>`;
    $("[data-fit]", win.body).addEventListener("click", () => $("#desktop").style.backgroundSize = "cover");
    $("[data-center]", win.body).addEventListener("click", () => $("#desktop").style.backgroundSize = "auto 100%");
    $("[data-ok]", win.body).addEventListener("click", win.close);
    $("[data-cancel]", win.body).addEventListener("click", win.close);
  }

  function openRun() {
    const win = createWindow({ title: "运行", icon: "🏃", width: 410, height: 185, resizable: false });
    win.body.innerHTML = `<div class="dialog"><p>请键入程序、文件夹、文档或 Internet 资源的名称，Windows 将为您打开它。</p><div class="dialog-row"><label for="run-input">打开(O):</label><input id="run-input" autocomplete="off"></div><div class="dialog-actions"><button class="xp-button" data-run>确定</button><button class="xp-button" data-cancel>取消</button></div></div>`;
    const input = $("input", win.body); input.focus();
    const execute = () => {
      const command = input.value.trim().toLowerCase().replace(".exe", "");
      const map = { notepad: "notepad", mspaint: "paint", winmine: "minesweeper", iexplore: "ie", explorer: "computer", control: "control" };
      if (map[command]) { win.close(); openApp(map[command]); } else notify("运行", `Windows 找不到“${input.value}”。`);
    };
    $("[data-run]", win.body).addEventListener("click", execute);
    $("[data-cancel]", win.body).addEventListener("click", win.close);
    input.addEventListener("keydown", event => { if (event.key === "Enter") execute(); });
  }

  function notify(title, text) {
    const balloon = $("#balloon");
    $("b", balloon).textContent = title;
    $("p", balloon).textContent = text;
    balloon.classList.remove("hidden");
    clearTimeout(balloonTimer);
    balloonTimer = setTimeout(() => balloon.classList.add("hidden"), 5200);
  }
  $("#balloon button").addEventListener("click", () => $("#balloon").classList.add("hidden"));

  $("#desktop").addEventListener("contextmenu", event => {
    if (event.target.closest(".xp-window,.taskbar,.start-menu")) return;
    event.preventDefault();
    const menu = $("#context-menu");
    menu.style.left = `${Math.min(event.clientX, innerWidth - 175)}px`;
    menu.style.top = `${Math.min(event.clientY, innerHeight - 115)}px`;
    menu.classList.remove("hidden");
  });
  document.addEventListener("pointerdown", event => { if (!event.target.closest("#context-menu")) $("#context-menu").classList.add("hidden"); });
  $("#context-menu").addEventListener("click", event => {
    const action = event.target.dataset.context;
    if (action === "refresh") { $("#desktop-icons").classList.add("hidden"); requestAnimationFrame(() => $("#desktop-icons").classList.remove("hidden")); }
    if (action === "notepad") openNotepad("", "新建文本文档.txt");
    if (action === "display") openDisplay();
    $("#context-menu").classList.add("hidden");
  });

  function shutdown() {
    closeStartMenu();
    $("#shutdown").classList.remove("hidden", "off");
    $("#shutdown-message").textContent = "Windows 正在关机...";
    setTimeout(() => {
      $("#shutdown").classList.add("off");
      $("#shutdown-message").textContent = "现在可以安全地关闭计算机了。";
      $("#restart-button").classList.remove("hidden");
    }, 1700);
  }

  function updateClock() {
    const now = new Date();
    $("#clock").textContent = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    $("#clock").title = now.toLocaleString("zh-CN");
  }
  renderDesktop();
  updateClock();
  setInterval(updateClock, 1000);
})();

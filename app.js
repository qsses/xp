(() => {
  "use strict";

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const asset = name => `assets/${name}`;

  const apps = [
    { id: "computer", name: "我的电脑", icon: "my-computer.png", open: openComputer },
    { id: "documents", name: "我的文档", icon: "my-documents.png", open: openDocuments },
    { id: "recycle", name: "回收站", icon: "recycle-bin.png", open: openRecycle },
    { id: "games", name: "游戏", icon: "games.png", open: openGames },
    { id: "notepad", name: "记事本", icon: "notepad.png", open: openNotepad },
    { id: "minesweeper", name: "扫雷", icon: "minesweeper.png", open: openMinesweeper },
    { id: "paint", name: "画图", icon: "mspaint.png", open: openPaint },
    { id: "ie", name: "Internet Explorer", icon: "ie6.png", open: openIE },
    { id: "cmd", name: "命令提示符", icon: "cmd.png", open: openCommandPrompt },
    { id: "calculator", name: "计算器", icon: "calculator.png", desktop: false, open: openCalculator },
    { id: "taskmgr", name: "Windows 任务管理器", icon: "taskmgr.png", desktop: false, open: openTaskManager },
    { id: "snake", name: "贪吃蛇", icon: "snake.png", desktop: false, open: openSnake },
    { id: "tetris", name: "俄罗斯方块", icon: "tetris.png", desktop: false, open: openTetris },
    { id: "solitaire", name: "纸牌接龙", icon: "solitaire.png", desktop: false, open: openSolitaire },
    { id: "ra2", name: "红色警戒2", icon: "ra2.png", desktop: false, open: openRedAlert },
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
    playStartupSound();
    notify("Windows XP", "欢迎回来，Administrator！\n双击桌面图标开始使用。");
  }

  function playTone(frequency, duration = .12, delay = 0, volume = .045) {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      const context = playTone.context ||= new AudioContext();
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const start = context.currentTime + delay;
      oscillator.type = "triangle";
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(.0001, start);
      gain.gain.exponentialRampToValueAtTime(volume, start + .015);
      gain.gain.exponentialRampToValueAtTime(.0001, start + duration);
      oscillator.connect(gain); gain.connect(context.destination);
      oscillator.start(start); oscillator.stop(start + duration + .03);
    } catch (_) {}
  }

  function playStartupSound() {
    [523, 659, 784, 1047].forEach((frequency, index) => playTone(frequency, .34, index * .13, .055));
  }

  function renderDesktop() {
    const desktop = $("#desktop-icons");
    desktop.innerHTML = "";
    apps.filter(app => app.desktop !== false && app.id !== "control").forEach(app => {
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
    ["ie", "notepad", "games", "cmd", "paint"].map(id => appMap[id]).forEach(app => {
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
    const win = createWindow({ title: "我的电脑", icon: `<img src="${asset("my-computer.png")}" width="16" height="16" alt="">`, width: 760, height: 510 });
    win.body.innerHTML = `<div class="explorer computer-app"><div class="menu-bar"><span>文件(F)</span><span>编辑(E)</span><span>查看(V)</span><span>收藏(A)</span><span>工具(T)</span><span>帮助(H)</span></div><div class="toolbar"><button data-back disabled>← 后退</button><button data-forward disabled>→ 前进</button><button data-up>⬆ 向上</button><i></i><button>🔍 搜索</button><button>📁 文件夹</button><button>▦ 查看</button></div><div class="address-bar"><label>地址(D)</label><img src="${asset("my-computer.png")}" alt=""><input data-address value="我的电脑" readonly><button>转到</button></div><div class="computer-main"><aside class="computer-tasks"><section><h3>系统任务</h3><button data-system>🖥️ 查看系统信息</button><button data-control>⚙️ 添加或删除程序</button><button data-display>🎨 更改一个设置</button></section><section><h3>其他位置</h3><button data-documents>📁 我的文档</button><button data-network>🌐 网上邻居</button><button data-control>⚙️ 控制面板</button></section><section class="details-panel"><h3>详细信息</h3><p data-details>我的电脑<br>系统文件夹</p></section></aside><div class="computer-content" data-content></div></div><div class="status-bar"><span data-object-count>6 个对象</span><span>我的电脑</span></div></div>`;
    const content = $("[data-content]", win.body), address = $("[data-address]", win.body), details = $("[data-details]", win.body), count = $("[data-object-count]", win.body);
    const history = ["我的电脑"]; let historyIndex = 0;
    const folders = {
      "本地磁盘 (C:)": [
        { name: "Documents and Settings", desc: "文件夹", icon: "my-documents.png" },
        { name: "Program Files", desc: "文件夹", icon: "my-documents.png" },
        { name: "WINDOWS", desc: "文件夹", icon: "my-documents.png" },
        { name: "AUTOEXEC.BAT", desc: "1 KB · BAT 文件", icon: "notepad.png" },
        { name: "boot.ini", desc: "1 KB · 配置设置", icon: "notepad.png" }
      ],
      "本地磁盘 (D:)": [
        { name: "游戏", desc: "文件夹", icon: "games.png", open: openGames },
        { name: "下载", desc: "文件夹", icon: "my-documents.png" },
        { name: "电影", desc: "文件夹", icon: "my-documents.png" },
        { name: "备份", desc: "文件夹", icon: "my-documents.png" }
      ]
    };
    const driveItem = (name, meta, icon, percent, open) => `<button class="drive-item" data-name="${name}" data-open="${open || ""}"><img src="${asset(icon)}" alt=""><span><b>${name}</b><small>${meta}</small>${percent != null ? `<i class="capacity"><em style="width:${percent}%"></em></i>` : ""}</span></button>`;
    const bindItems = () => {
      $$("[data-name]", content).forEach(button => {
        button.addEventListener("click", () => { $$("[data-name]", content).forEach(x => x.classList.remove("selected")); button.classList.add("selected"); details.innerHTML = `<b>${button.dataset.name}</b><br>${$("small", button)?.textContent || "文件夹"}`; });
        button.addEventListener("dblclick", () => {
          const action = button.dataset.open;
          if (action === "documents") return openDocuments(); if (action === "games") return openGames();
          if (action === "floppy") return notify("3½ 软盘 (A:)", "请将磁盘插入驱动器 A:。");
          if (action === "dvd") return notify("DVD 驱动器 (E:)", "驱动器中没有光盘。");
          if (folders[button.dataset.name]) navigate(button.dataset.name);
          else notify(button.dataset.name, "此文件夹为空。 ");
        });
      });
    };
    const renderRoot = () => {
      content.innerHTML = `<h2>存储在此计算机上的文件</h2><div class="drive-grid">${driveItem("Administrator 的文档", "文件夹", "my-documents.png", null, "documents")}${driveItem("共享文档", "文件夹", "my-documents.png", null, "documents")}</div><h2>硬盘驱动器</h2><div class="drive-grid">${driveItem("本地磁盘 (C:)", "总大小 40.0 GB，可用空间 18.6 GB", "my-computer.png", 54)}${driveItem("本地磁盘 (D:)", "总大小 80.0 GB，可用空间 52.3 GB", "my-computer.png", 35)}</div><h2>有可移动存储的设备</h2><div class="drive-grid">${driveItem("3½ 软盘 (A:)", "可移动磁盘", "my-computer.png", null, "floppy")}${driveItem("DVD 驱动器 (E:)", "DVD-RW 驱动器", "my-computer.png", null, "dvd")}</div>`;
      count.textContent = "6 个对象"; details.innerHTML = "<b>我的电脑</b><br>系统文件夹"; bindItems();
    };
    const renderFolder = name => {
      const items = folders[name]; content.innerHTML = `<h2>${name}</h2><div class="folder-list">${items.map(item => driveItem(item.name, item.desc, item.icon, null, item.open === openGames ? "games" : "")).join("")}</div>`;
      count.textContent = `${items.length} 个对象`; details.innerHTML = `<b>${name}</b><br>本地磁盘`; bindItems();
    };
    function navigate(name, record = true) {
      address.value = name === "我的电脑" ? "我的电脑" : `我的电脑\\${name}`;
      if (name === "我的电脑") renderRoot(); else renderFolder(name);
      if (record) { history.splice(historyIndex + 1); history.push(name); historyIndex = history.length - 1; }
      $("[data-back]", win.body).disabled = historyIndex === 0; $("[data-forward]", win.body).disabled = historyIndex === history.length - 1;
    }
    $("[data-back]", win.body).addEventListener("click", () => { if (historyIndex > 0) navigate(history[--historyIndex], false); });
    $("[data-forward]", win.body).addEventListener("click", () => { if (historyIndex < history.length - 1) navigate(history[++historyIndex], false); });
    $("[data-up]", win.body).addEventListener("click", () => navigate("我的电脑"));
    $("[data-documents]", win.body).addEventListener("click", openDocuments);
    $$("[data-control]", win.body).forEach(button => button.addEventListener("click", openControl));
    $("[data-display]", win.body).addEventListener("click", openDisplay);
    $("[data-system]", win.body).addEventListener("click", () => notify("系统属性", "Microsoft Windows XP Professional\n版本 2002 Service Pack 3\n计算机: Intel Pentium 4 3.00GHz\n1.00 GB 内存"));
    $("[data-network]", win.body).addEventListener("click", () => notify("网上邻居", "工作组 MSHOME 中没有找到其他计算机。"));
    renderRoot();
  }

  function openDocuments() {
    explorerWindow("我的文档", "my-documents.png", [
      { name: "我的图片", icon: "my-documents.png", open: () => notify("我的图片", "文件夹是空的。") },
      { name: "我的音乐", icon: "my-documents.png", open: () => notify("我的音乐", "童话.mp3\n江南.mp3\n十年.mp3") },
      { name: "欢迎.txt", icon: "notepad.png", open: () => openNotepad("欢迎使用 Windows XP 怀旧桌面！\n\n这里可以打开程序、拖动窗口、玩扫雷并在画图中涂鸦。", "欢迎.txt") },
      { name: "心情日记.txt", icon: "notepad.png", open: () => openNotepad("2005年7月17日 晴\n\n今天申请了新的 QQ 号，晚上准备去网吧。", "心情日记.txt") }
    ], "文件和文件夹任务", "新建一个文件夹\n将这个文件夹发布到 Web\n共享此文件夹");
  }

  function openGames() {
    explorerWindow("游戏", "games.png", [
      { name: "扫雷", icon: "minesweeper.png", open: () => openApp("minesweeper") },
      { name: "贪吃蛇", icon: "snake.png", open: () => openApp("snake") },
      { name: "俄罗斯方块", icon: "tetris.png", open: () => openApp("tetris") },
      { name: "纸牌接龙", icon: "solitaire.png", open: () => openApp("solitaire") },
      { name: "红色警戒2", icon: "ra2.png", open: () => openApp("ra2") }
    ], "游戏任务", "双击图标开始游戏\n查看最高分\n添加或删除游戏");
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
    let savedRecord = null; try { savedRecord = JSON.parse(localStorage.getItem("xp-clone-notepad") || "null"); } catch (_) {}
    const saved = content ?? savedRecord?.content ?? ""; if (fileName === "无标题" && savedRecord?.name) fileName = savedRecord.name;
    win.body.innerHTML = `<div class="functional-menubar"><details><summary>文件(F)</summary><div><button data-new>新建</button><button data-open>打开...</button><button data-save>保存</button><button data-save-as>另存为...</button><hr><button data-close>退出</button></div></details><details><summary>编辑(E)</summary><div><button data-undo>撤销</button><hr><button data-select-all>全选</button><button data-time>时间/日期</button></div></details><details><summary>格式(O)</summary><div><button data-wrap>自动换行 ✓</button><button data-font>字体...</button></div></details><details><summary>查看(V)</summary><div><button data-status-toggle>状态栏 ✓</button></div></details><details><summary>帮助(H)</summary><div><button data-about>关于记事本</button></div></details></div><input type="file" accept=".txt,text/plain" data-file hidden><textarea class="notepad" spellcheck="false"></textarea><div class="notepad-status"><span data-position>第 1 行，第 1 列</span><span>Windows (CRLF)</span><span>UTF-8</span></div>`;
    const area = $("textarea", win.body); area.value = saved; let dirty = false, wrapped = true;
    const updateTitle = () => win.setTitle(`${dirty ? "*" : ""}${fileName} - 记事本`);
    const closeMenu = button => { const menu = button.closest("details"); if (menu) menu.open = false; };
    const saveLocal = () => { localStorage.setItem("xp-clone-notepad", JSON.stringify({ name: fileName, content: area.value })); dirty = false; updateTitle(); notify("记事本", `已保存 ${fileName}`); };
    const download = () => { const name = fileName === "无标题" ? "新建文本文档.txt" : fileName.endsWith(".txt") ? fileName : `${fileName}.txt`; const url = URL.createObjectURL(new Blob([area.value], { type: "text/plain;charset=utf-8" })); const link = document.createElement("a"); link.href = url; link.download = name; link.click(); URL.revokeObjectURL(url); fileName = name; saveLocal(); };
    const updatePosition = () => { const lines = area.value.slice(0, area.selectionStart).split("\n"); $("[data-position]", win.body).textContent = `第 ${lines.length} 行，第 ${lines.at(-1).length + 1} 列`; };
    area.addEventListener("input", () => { dirty = true; updateTitle(); updatePosition(); }); area.addEventListener("keyup", updatePosition); area.addEventListener("click", updatePosition);
    $("[data-new]", win.body).addEventListener("click", event => { closeMenu(event.currentTarget); area.value = ""; fileName = "无标题"; dirty = false; updateTitle(); area.focus(); });
    $("[data-open]", win.body).addEventListener("click", event => { closeMenu(event.currentTarget); $("[data-file]", win.body).click(); });
    $("[data-file]", win.body).addEventListener("change", event => { const file = event.target.files[0]; if (!file) return; const reader = new FileReader(); reader.onload = () => { area.value = String(reader.result); fileName = file.name; dirty = false; updateTitle(); updatePosition(); }; reader.readAsText(file, "UTF-8"); });
    $("[data-save]", win.body).addEventListener("click", event => { closeMenu(event.currentTarget); saveLocal(); }); $("[data-save-as]", win.body).addEventListener("click", event => { closeMenu(event.currentTarget); download(); }); $("[data-close]", win.body).addEventListener("click", win.close);
    $("[data-undo]", win.body).addEventListener("click", event => { closeMenu(event.currentTarget); area.focus(); document.execCommand("undo"); }); $("[data-select-all]", win.body).addEventListener("click", event => { closeMenu(event.currentTarget); area.select(); area.focus(); });
    $("[data-time]", win.body).addEventListener("click", event => { closeMenu(event.currentTarget); area.setRangeText(new Date().toLocaleString("zh-CN"), area.selectionStart, area.selectionEnd, "end"); area.dispatchEvent(new Event("input")); area.focus(); });
    $("[data-wrap]", win.body).addEventListener("click", event => { wrapped = !wrapped; area.wrap = wrapped ? "soft" : "off"; area.style.whiteSpace = wrapped ? "pre-wrap" : "pre"; event.currentTarget.textContent = `自动换行 ${wrapped ? "✓" : ""}`; closeMenu(event.currentTarget); });
    $("[data-status-toggle]", win.body).addEventListener("click", event => { const status = $(".notepad-status", win.body); status.classList.toggle("hidden"); event.currentTarget.textContent = `状态栏 ${status.classList.contains("hidden") ? "" : "✓"}`; closeMenu(event.currentTarget); });
    $("[data-font]", win.body).addEventListener("click", event => { closeMenu(event.currentTarget); const dialog = createWindow({ title: "字体", icon: "🔤", width: 390, height: 255, resizable: false }); dialog.body.innerHTML = `<div class="dialog"><div class="font-grid"><label>字体<select data-family><option>Lucida Console</option><option>Courier New</option><option>Tahoma</option><option>Microsoft YaHei</option></select></label><label>大小<input data-size type="number" min="8" max="36" value="14"></label></div><div class="font-preview">AaBbYyZz　中文预览</div><div class="dialog-actions"><button class="xp-button" data-apply>确定</button><button class="xp-button" data-cancel>取消</button></div></div>`; $("[data-apply]", dialog.body).addEventListener("click", () => { area.style.fontFamily = $("[data-family]", dialog.body).value; area.style.fontSize = `${$("[data-size]", dialog.body).value}px`; dialog.close(); }); $("[data-cancel]", dialog.body).addEventListener("click", dialog.close); });
    $("[data-about]", win.body).addEventListener("click", event => { closeMenu(event.currentTarget); notify("关于记事本", "Microsoft Windows XP 记事本\n浏览器模拟版本"); }); area.focus();
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

  function openSnake() {
    const win = createWindow({ title: "贪吃蛇", icon: `<img src="${asset("snake.png")}" width="16" alt="">`, width: 500, height: 450, resizable: false });
    win.body.innerHTML = `<div class="retro-game"><div class="menu-bar"><span>游戏(G)</span><span>选项(O)</span><span>帮助(H)</span></div><div class="game-toolbar"><button data-new>新游戏</button><button data-pause>暂停</button><span>得分：<b data-score>0</b></span><span>最高：<b data-best>${localStorage.getItem("xp-snake-best") || 0}</b></span></div><div class="game-stage"><canvas class="snake-canvas" width="400" height="320"></canvas></div><div class="status-bar">方向键或 WASD 控制，空格暂停</div></div>`;
    const canvas = $("canvas", win.body), context = canvas.getContext("2d");
    let snake, apple, direction, nextDirection, timer, paused, score;
    const randomApple = () => {
      let point;
      do point = { x: Math.floor(Math.random() * 20), y: Math.floor(Math.random() * 16) };
      while (snake.some(part => part.x === point.x && part.y === point.y));
      return point;
    };
    const draw = () => {
      context.fillStyle = "#102d16"; context.fillRect(0, 0, 400, 320);
      context.strokeStyle = "rgba(132,210,119,.09)";
      for (let x = 0; x <= 400; x += 20) { context.beginPath(); context.moveTo(x, 0); context.lineTo(x, 320); context.stroke(); }
      for (let y = 0; y <= 320; y += 20) { context.beginPath(); context.moveTo(0, y); context.lineTo(400, y); context.stroke(); }
      context.fillStyle = "#e53d36"; context.beginPath(); context.arc(apple.x * 20 + 10, apple.y * 20 + 10, 8, 0, Math.PI * 2); context.fill();
      snake.forEach((part, index) => { context.fillStyle = index ? "#62d94d" : "#b1ff79"; context.fillRect(part.x * 20 + 2, part.y * 20 + 2, 16, 16); });
      if (paused) { context.fillStyle = "rgba(0,0,0,.55)"; context.fillRect(0, 0, 400, 320); context.fillStyle = "#fff"; context.font = "bold 28px Tahoma"; context.textAlign = "center"; context.fillText("已暂停", 200, 170); }
    };
    const stop = message => {
      clearInterval(timer); timer = null; paused = true; draw();
      const best = Math.max(score, Number(localStorage.getItem("xp-snake-best") || 0));
      localStorage.setItem("xp-snake-best", best); $("[data-best]", win.body).textContent = best;
      notify("贪吃蛇", message);
    };
    const tick = () => {
      if (paused) return;
      direction = nextDirection;
      const head = { x: snake[0].x + direction.x, y: snake[0].y + direction.y };
      if (head.x < 0 || head.x >= 20 || head.y < 0 || head.y >= 16 || snake.some(part => part.x === head.x && part.y === head.y)) return stop(`游戏结束，得分 ${score}`);
      snake.unshift(head);
      if (head.x === apple.x && head.y === apple.y) {
        score += 10; $("[data-score]", win.body).textContent = score; apple = randomApple(); playTone(760, .08);
      } else snake.pop();
      draw();
    };
    const start = () => {
      clearInterval(timer); snake = [{ x: 8, y: 8 }, { x: 7, y: 8 }, { x: 6, y: 8 }];
      direction = nextDirection = { x: 1, y: 0 }; score = 0; paused = false; apple = randomApple();
      $("[data-score]", win.body).textContent = "0"; timer = setInterval(tick, 125); draw();
    };
    const keyHandler = event => {
      const keys = { ArrowUp: [0, -1], w: [0, -1], W: [0, -1], ArrowDown: [0, 1], s: [0, 1], S: [0, 1], ArrowLeft: [-1, 0], a: [-1, 0], A: [-1, 0], ArrowRight: [1, 0], d: [1, 0], D: [1, 0] };
      if (event.code === "Space") { event.preventDefault(); paused = !paused; draw(); return; }
      const next = keys[event.key]; if (!next) return;
      event.preventDefault(); if (next[0] !== -direction.x || next[1] !== -direction.y) nextDirection = { x: next[0], y: next[1] };
    };
    window.addEventListener("keydown", keyHandler);
    $("[data-new]", win.body).addEventListener("click", start);
    $("[data-pause]", win.body).addEventListener("click", () => { paused = !paused; draw(); });
    const close = win.close; win.close = () => { clearInterval(timer); window.removeEventListener("keydown", keyHandler); close(); };
    start();
  }

  function openTetris() {
    const win = createWindow({ title: "俄罗斯方块", icon: `<img src="${asset("tetris.png")}" width="16" alt="">`, width: 430, height: 590, resizable: false });
    win.body.innerHTML = `<div class="retro-game"><div class="menu-bar"><span>游戏(G)</span><span>选项(O)</span><span>帮助(H)</span></div><div class="tetris-layout"><div class="game-stage"><canvas class="tetris-canvas" width="240" height="480"></canvas></div><aside class="tetris-panel"><h3>俄罗斯方块</h3><p>得分<br><b data-score>0</b></p><p>行数<br><b data-lines>0</b></p><button data-new>新游戏</button><button data-pause>暂停</button><small>← → 移动<br>↑ 旋转<br>↓ 加速<br>空格 落下</small></aside></div><div class="status-bar">消除整行方块获得分数</div></div>`;
    const canvas = $("canvas", win.body), context = canvas.getContext("2d"), width = 10, height = 20;
    const colors = [null, "#33c6ff", "#ffd33d", "#9c62ff", "#49d267", "#ed5b62", "#4e78e8", "#f39a35"];
    const shapes = [
      [[1,1,1,1]], [[2,2],[2,2]], [[0,3,0],[3,3,3]], [[0,4,4],[4,4,0]], [[5,5,0],[0,5,5]], [[6,0,0],[6,6,6]], [[0,0,7],[7,7,7]]
    ];
    let board, piece, timer, paused, score, lines;
    const newPiece = () => ({ matrix: shapes[Math.floor(Math.random() * shapes.length)].map(row => [...row]), x: 3, y: 0 });
    const collide = (candidate, dx = 0, dy = 0, matrix = candidate.matrix) => matrix.some((row, y) => row.some((value, x) => value && (candidate.y + y + dy >= height || candidate.x + x + dx < 0 || candidate.x + x + dx >= width || board[candidate.y + y + dy]?.[candidate.x + x + dx])));
    const rotate = matrix => matrix[0].map((_, index) => matrix.map(row => row[index]).reverse());
    const drawBlock = (x, y, color) => { context.fillStyle = color; context.fillRect(x * 24, y * 24, 24, 24); context.strokeStyle = "rgba(255,255,255,.75)"; context.strokeRect(x * 24 + 1, y * 24 + 1, 22, 22); };
    const draw = () => {
      context.fillStyle = "#090d1f"; context.fillRect(0, 0, 240, 480);
      board.forEach((row, y) => row.forEach((value, x) => value && drawBlock(x, y, colors[value])));
      piece.matrix.forEach((row, y) => row.forEach((value, x) => value && drawBlock(piece.x + x, piece.y + y, colors[value])));
      if (paused) { context.fillStyle = "rgba(0,0,0,.6)"; context.fillRect(0, 0, 240, 480); context.fillStyle = "white"; context.font = "bold 23px Tahoma"; context.textAlign = "center"; context.fillText("已暂停", 120, 250); }
    };
    const updateStats = () => { $("[data-score]", win.body).textContent = score; $("[data-lines]", win.body).textContent = lines; };
    const merge = () => piece.matrix.forEach((row, y) => row.forEach((value, x) => { if (value) board[piece.y + y][piece.x + x] = value; }));
    const clearLines = () => {
      let cleared = 0;
      for (let y = height - 1; y >= 0; y--) if (board[y].every(Boolean)) { board.splice(y, 1); board.unshift(Array(width).fill(0)); cleared++; y++; }
      if (cleared) { lines += cleared; score += [0, 100, 300, 500, 800][cleared]; playTone(880, .12); updateStats(); }
    };
    const drop = () => {
      if (paused) return;
      if (!collide(piece, 0, 1)) piece.y++;
      else { merge(); clearLines(); piece = newPiece(); if (collide(piece)) { clearInterval(timer); paused = true; notify("俄罗斯方块", `游戏结束，得分 ${score}`); } }
      draw();
    };
    const start = () => { clearInterval(timer); board = Array.from({ length: height }, () => Array(width).fill(0)); piece = newPiece(); score = lines = 0; paused = false; updateStats(); timer = setInterval(drop, 600); draw(); };
    const keyHandler = event => {
      if (!["ArrowLeft", "ArrowRight", "ArrowDown", "ArrowUp", "Space"].includes(event.code)) return;
      event.preventDefault(); if (paused && event.code !== "Space") return;
      if (event.code === "ArrowLeft" && !collide(piece, -1)) piece.x--;
      if (event.code === "ArrowRight" && !collide(piece, 1)) piece.x++;
      if (event.code === "ArrowDown") { drop(); score++; updateStats(); }
      if (event.code === "ArrowUp") { const rotated = rotate(piece.matrix); if (!collide(piece, 0, 0, rotated)) piece.matrix = rotated; }
      if (event.code === "Space") { while (!collide(piece, 0, 1)) { piece.y++; score += 2; } drop(); updateStats(); }
      draw();
    };
    window.addEventListener("keydown", keyHandler);
    $("[data-new]", win.body).addEventListener("click", start);
    $("[data-pause]", win.body).addEventListener("click", () => { paused = !paused; draw(); });
    const close = win.close; win.close = () => { clearInterval(timer); window.removeEventListener("keydown", keyHandler); close(); };
    start();
  }

  function openSolitaire() {
    const win = createWindow({ title: "纸牌接龙", icon: `<img src="${asset("solitaire.png")}" width="16" alt="">`, width: 790, height: 550 });
    win.body.innerHTML = `<div class="solitaire-app"><div class="menu-bar"><span>游戏(G)</span><span>帮助(H)</span></div><div class="game-toolbar"><button data-new>新游戏</button><span>规则：红黑交替、点数递减；双击可自动收牌</span></div><div class="solitaire-table"><div class="solitaire-top"><button class="card-pile stock" data-stock>牌堆</button><div class="waste" data-waste></div><div class="foundations" data-foundations></div></div><div class="tableau" data-tableau></div></div><div class="status-bar" data-status>单击牌堆开始发牌</div></div>`;
    const suits = ["♠", "♥", "♦", "♣"], ranks = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
    let stock, waste, foundations, tableau, selected;
    const color = suit => suit === "♥" || suit === "♦" ? "red" : "black";
    const cardButton = (card, faceUp = true) => {
      const button = document.createElement("button"); button.className = `playing-card ${faceUp ? "face-up" : "face-down"} ${color(card.suit)}`;
      button.innerHTML = faceUp ? `<b>${ranks[card.rank]}</b><span>${card.suit}</span>` : ""; return button;
    };
    const canStack = (card, target) => !target ? card.rank === 12 : color(card.suit) !== color(target.suit) && card.rank === target.rank - 1;
    const render = () => {
      $("[data-stock]", win.body).textContent = stock.length ? `牌堆\n${stock.length}` : "重发";
      const wasteEl = $("[data-waste]", win.body); wasteEl.innerHTML = "";
      if (waste.length) { const button = cardButton(waste.at(-1)); button.classList.toggle("selected", selected?.source === "waste"); button.addEventListener("click", () => { selected = { source: "waste", card: waste.at(-1) }; render(); }); button.addEventListener("dblclick", autoFoundation); wasteEl.appendChild(button); }
      const foundationsEl = $("[data-foundations]", win.body); foundationsEl.innerHTML = "";
      foundations.forEach((pile, index) => { const slot = document.createElement("div"); slot.className = "foundation-slot"; slot.setAttribute("role", "button"); slot.tabIndex = 0; if (pile.length) slot.appendChild(cardButton(pile.at(-1))); else slot.textContent = suits[index]; slot.addEventListener("click", () => moveToFoundation(index)); foundationsEl.appendChild(slot); });
      const tableauEl = $("[data-tableau]", win.body); tableauEl.innerHTML = "";
      tableau.forEach((pile, column) => { const col = document.createElement("div"); col.className = "card-column"; col.addEventListener("click", event => { if (event.target === col && selected) moveToColumn(column); }); pile.forEach((entry, index) => { const button = cardButton(entry.card, entry.faceUp); button.style.top = `${index * 27}px`; if (entry.faceUp && index === pile.length - 1) { button.addEventListener("click", event => { event.stopPropagation(); if (selected) moveToColumn(column); else { selected = { source: "tableau", column, card: entry.card }; render(); } }); button.addEventListener("dblclick", autoFoundation); } col.appendChild(button); }); tableauEl.appendChild(col); });
    };
    const takeSelected = () => selected.source === "waste" ? waste.pop() : tableau[selected.column].pop().card;
    const expose = column => { const top = tableau[column]?.at(-1); if (top) top.faceUp = true; };
    const moveToColumn = column => {
      if (!selected) return; const targetEntry = tableau[column].at(-1), target = targetEntry?.faceUp ? targetEntry.card : null;
      if (!canStack(selected.card, target)) { playTone(190, .2); return; }
      const sourceColumn = selected.column, card = takeSelected(); tableau[column].push({ card, faceUp: true }); if (selected.source === "tableau") expose(sourceColumn); selected = null; render();
    };
    const moveToFoundation = index => {
      if (!selected || selected.card.suit !== suits[index] || selected.card.rank !== foundations[index].length) return;
      const sourceColumn = selected.column, card = takeSelected(); foundations[index].push(card); if (selected.source === "tableau") expose(sourceColumn); selected = null; playTone(660, .08); render();
      if (foundations.every(pile => pile.length === 13)) notify("纸牌接龙", "恭喜，所有纸牌都已收齐！");
    };
    function autoFoundation(event) {
      event.stopPropagation(); if (!selected) return;
      const index = suits.indexOf(selected.card.suit); moveToFoundation(index);
    }
    const deal = () => {
      if (!stock.length) { stock = waste.reverse(); waste = []; }
      else waste.push(stock.pop()); selected = null; render();
    };
    const start = () => {
      const deck = suits.flatMap(suit => ranks.map((_, rank) => ({ suit, rank }))).sort(() => Math.random() - .5);
      tableau = Array.from({ length: 7 }, (_, column) => Array.from({ length: column + 1 }, (_, index) => ({ card: deck.pop(), faceUp: index === column })));
      stock = deck; waste = []; foundations = suits.map(() => []); selected = null; render();
    };
    $("[data-stock]", win.body).addEventListener("click", deal); $("[data-new]", win.body).addEventListener("click", start); start();
  }

  function openRedAlert() {
    const win = createWindow({ title: "红色警戒2 - 遭遇战", icon: `<img src="${asset("ra2.png")}" width="16" alt="">`, width: 650, height: 460, resizable: false });
    win.body.innerHTML = `<div class="ra-game"><div class="ra-header"><img src="${asset("ra2.png")}" alt=""><div><b>红色警戒2</b><small>单人遭遇战 · 冰天雪地</small></div></div><div class="ra-battle"><div class="ra-base ally"><b>盟军基地</b><span data-health>100%</span><div class="health"><i></i></div><div class="units" data-units></div></div><div class="ra-field"><span>💥</span><p data-log>指挥官，等待您的命令。</p></div><div class="ra-base enemy"><b>苏军基地</b><span data-enemy>100%</span><div class="health enemy-health"><i></i></div><div class="units">🚩 🏭 🛡️</div></div></div><div class="ra-console"><span>资金：$<b data-money>1200</b></span><button data-build>建造坦克 $200</button><button data-attack>全军出击</button><button data-repair>维修基地 $300</button><button data-new>重新开始</button></div></div>`;
    let money, tanks, health, enemy, ended;
    const update = message => {
      $("[data-money]", win.body).textContent = money; $("[data-health]", win.body).textContent = `${health}%`; $("[data-enemy]", win.body).textContent = `${enemy}%`;
      $(".ally .health i", win.body).style.width = `${health}%`; $(".enemy-health i", win.body).style.width = `${enemy}%`;
      $("[data-units]", win.body).textContent = "🛡️ " + "🚙".repeat(Math.min(tanks, 10)); $("[data-log]", win.body).textContent = message;
    };
    const start = () => { money = 1200; tanks = 2; health = enemy = 100; ended = false; update("指挥官，等待您的命令。"); };
    $("[data-build]", win.body).addEventListener("click", () => { if (ended) return; if (money < 200) return update("资金不足。需要更多矿石。"); money -= 200; tanks++; update("灰熊坦克建造完成。"); playTone(520, .08); });
    $("[data-repair]", win.body).addEventListener("click", () => { if (money < 300 || health >= 100) return; money -= 300; health = Math.min(100, health + 30); update("工程师正在维修基地。"); });
    $("[data-attack]", win.body).addEventListener("click", () => {
      if (ended || !tanks) return; const damage = Math.min(enemy, Math.max(5, tanks * 6 + Math.floor(Math.random() * 12))); enemy -= damage;
      if (enemy <= 0) { enemy = 0; ended = true; update("任务完成！敌军基地已被摧毁。"); playStartupSound(); return; }
      const lost = Math.min(tanks, Math.random() < .55 ? 1 : 0); tanks -= lost; health = Math.max(0, health - (8 + Math.floor(Math.random() * 13))); money += 140;
      if (health <= 0) { ended = true; update("任务失败。盟军基地已经沦陷。"); playTone(160, .4); } else update(`攻击造成 ${damage}% 伤害，损失 ${lost} 辆坦克。采矿车带回 $140。`);
    });
    $("[data-new]", win.body).addEventListener("click", start); start();
  }

  function openPaint() {
    const win = createWindow({ title: "画图", icon: `<img src="${asset("mspaint.png")}" width="16" alt="">`, width: 720, height: 500 });
    win.body.innerHTML = `<div class="paint-app"><div class="functional-menubar"><details><summary>文件(F)</summary><div><button data-new>新建</button><button data-open>打开...</button><button data-save>保存 PNG</button><hr><button data-close>退出</button></div></details><details><summary>编辑(E)</summary><div><button data-undo>撤销</button><button data-redo>重复</button></div></details><details><summary>查看(V)</summary><div><button data-grid>查看网格</button></div></details><details><summary>图像(I)</summary><div><button data-clear>清除图像</button></div></details><details><summary>帮助(H)</summary><div><button data-about>关于画图</button></div></details></div><input type="file" accept="image/*" data-image-file hidden><div class="toolbar paint-toolbar"><button data-tool="pencil" class="active">✏️ 铅笔</button><button data-tool="eraser">▱ 橡皮</button><button data-tool="fill">▣ 填充</button><button data-undo title="撤销">↶</button><button data-redo title="重做">↷</button><label>粗细 <input type="range" min="1" max="24" value="3" data-size></label><div class="paint-colors">${["#000000","#ffffff","#e02020","#f2c230","#1565c0","#1c8b35","#8c35ad","#ef7f1a"].map(value => `<button class="swatch" data-color="${value}" style="background:${value}" title="${value}"></button>`).join("")}</div></div><div class="paint-canvas-wrap"><canvas class="paint-canvas" width="900" height="560"></canvas></div><div class="status-bar"><span data-paint-status>铅笔 · 3 像素</span><span>900 × 560 像素</span></div></div>`;
    const canvas = $("canvas", win.body), ctx = canvas.getContext("2d"); let drawing = false, color = "#000", size = 3, tool = "pencil", history = [], historyIndex = -1;
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    const point = event => { const rect = canvas.getBoundingClientRect(); return { x: (event.clientX - rect.left) * canvas.width / rect.width, y: (event.clientY - rect.top) * canvas.height / rect.height }; };
    const status = () => $("[data-paint-status]", win.body).textContent = `${tool === "pencil" ? "铅笔" : tool === "eraser" ? "橡皮" : "填充"} · ${size} 像素`;
    const snapshot = () => { history = history.slice(0, historyIndex + 1); history.push(canvas.toDataURL("image/png")); if (history.length > 18) history.shift(); historyIndex = history.length - 1; try { localStorage.setItem("xp-paint-image", history[historyIndex]); } catch (_) {} };
    const restore = index => { if (index < 0 || index >= history.length) return; const image = new Image(); image.onload = () => { ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.drawImage(image, 0, 0); }; image.src = history[historyIndex = index]; };
    const blank = () => { ctx.save(); ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.restore(); snapshot(); };
    canvas.addEventListener("pointerdown", event => { const p = point(event); if (tool === "fill") { ctx.fillStyle = color; ctx.fillRect(0, 0, canvas.width, canvas.height); snapshot(); return; } drawing = true; ctx.beginPath(); ctx.moveTo(p.x, p.y); canvas.setPointerCapture(event.pointerId); });
    canvas.addEventListener("pointermove", event => { if (!drawing) return; const p = point(event); ctx.strokeStyle = tool === "eraser" ? "#fff" : color; ctx.lineWidth = tool === "eraser" ? Math.max(10, size * 3) : size; ctx.lineTo(p.x, p.y); ctx.stroke(); });
    canvas.addEventListener("pointerup", () => { if (drawing) snapshot(); drawing = false; });
    $$("[data-color]", win.body).forEach(button => button.addEventListener("click", () => color = button.dataset.color));
    $$("[data-tool]", win.body).forEach(button => button.addEventListener("click", () => { tool = button.dataset.tool; $$("[data-tool]", win.body).forEach(x => x.classList.toggle("active", x === button)); status(); }));
    $("[data-size]", win.body).addEventListener("input", event => { size = Number(event.target.value); status(); }); $$("[data-undo]", win.body).forEach(button => button.addEventListener("click", () => restore(historyIndex - 1))); $$("[data-redo]", win.body).forEach(button => button.addEventListener("click", () => restore(historyIndex + 1)));
    $("[data-new]", win.body).addEventListener("click", blank); $("[data-clear]", win.body).addEventListener("click", blank); $("[data-close]", win.body).addEventListener("click", win.close); $("[data-open]", win.body).addEventListener("click", () => $("[data-image-file]", win.body).click());
    $("[data-image-file]", win.body).addEventListener("change", event => { const file = event.target.files[0]; if (!file) return; const url = URL.createObjectURL(file), image = new Image(); image.onload = () => { ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, canvas.width, canvas.height); const ratio = Math.min(canvas.width / image.width, canvas.height / image.height, 1); ctx.drawImage(image, 0, 0, image.width * ratio, image.height * ratio); URL.revokeObjectURL(url); snapshot(); }; image.src = url; });
    $("[data-save]", win.body).addEventListener("click", () => { const link = document.createElement("a"); link.href = canvas.toDataURL("image/png"); link.download = "无标题.png"; link.click(); notify("画图", "图像已保存为 PNG 文件。"); });
    $("[data-grid]", win.body).addEventListener("click", () => canvas.classList.toggle("show-grid")); $("[data-about]", win.body).addEventListener("click", () => notify("关于画图", "Microsoft Paint for Windows XP\n浏览器模拟版本"));
    const stored = localStorage.getItem("xp-paint-image"); if (stored) { history = [stored]; historyIndex = 0; restore(0); } else blank(); status();
  }

  function openIE() {
    const win = createWindow({ title: "Microsoft Internet Explorer", icon: `<img src="${asset("ie6.png")}" width="16" alt="">`, width: 760, height: 510 });
    win.body.innerHTML = `<div class="explorer ie-app"><div class="menu-bar"><span>文件(F)</span><span>编辑(E)</span><span>查看(V)</span><span>收藏(A)</span><span>工具(T)</span><span>帮助(H)</span></div><div class="toolbar ie-toolbar"><button data-home title="主页">🏠</button><button data-back title="后退">← 后退</button><button data-forward title="前进">→ 前进</button><button data-refresh title="刷新">⟳</button><label class="ie-address">地址 <input value="https://example.com" aria-label="网址"></label><button data-go>转到</button><button data-external title="在新窗口中打开">新窗口</button></div><div class="ie-notice">部分现代网站禁止在旧浏览器窗口中嵌入，无法显示时请点击“新窗口”。</div><iframe class="ie-frame" title="Internet Explorer 网页" src="https://example.com" sandbox="allow-forms allow-modals allow-popups allow-popups-to-escape-sandbox allow-scripts" referrerpolicy="no-referrer"></iframe><div class="status-bar"><span data-ie-status>正在打开 https://example.com</span><span>Internet</span></div></div>`;
    const frame = $("iframe", win.body), input = $(".ie-address input", win.body), status = $("[data-ie-status]", win.body);
    const history = [frame.src]; let historyIndex = 0;
    const normalize = value => {
      const text = value.trim();
      if (!text) return "https://example.com";
      if (/^https?:\/\//i.test(text)) return text;
      if (/^[\w.-]+\.[a-z]{2,}(\/.*)?$/i.test(text)) return `https://${text}`;
      return `https://www.bing.com/search?q=${encodeURIComponent(text)}`;
    };
    const navigate = (value, record = true) => {
      const url = normalize(value); input.value = url; status.textContent = `正在打开 ${url}`; frame.src = url;
      if (record) { history.splice(historyIndex + 1); history.push(url); historyIndex = history.length - 1; }
    };
    frame.addEventListener("load", () => status.textContent = `完成：${input.value}`);
    frame.addEventListener("error", () => status.textContent = "页面无法嵌入，请使用“新窗口”打开。" );
    $("[data-go]", win.body).addEventListener("click", () => navigate(input.value));
    $("[data-home]", win.body).addEventListener("click", () => navigate("https://example.com"));
    $("[data-refresh]", win.body).addEventListener("click", () => { frame.src = frame.src; status.textContent = "正在刷新..."; });
    $("[data-back]", win.body).addEventListener("click", () => { if (historyIndex > 0) navigate(history[--historyIndex], false); });
    $("[data-forward]", win.body).addEventListener("click", () => { if (historyIndex < history.length - 1) navigate(history[++historyIndex], false); });
    $("[data-external]", win.body).addEventListener("click", () => window.open(normalize(input.value), "_blank", "noopener,noreferrer"));
    input.addEventListener("keydown", event => { if (event.key === "Enter") navigate(input.value); });
  }

  function openCommandPrompt() {
    const win = createWindow({ title: "C:\\WINDOWS\\system32\\cmd.exe", icon: `<img src="${asset("cmd.png")}" width="16" alt="">`, width: 680, height: 430 });
    win.body.innerHTML = `<div class="cmd-app"><div class="cmd-output" data-output></div><div class="cmd-line"><span data-prompt></span><input aria-label="命令" autocomplete="off" spellcheck="false"></div></div>`;
    const output = $("[data-output]", win.body), input = $("input", win.body), prompt = $("[data-prompt]", win.body);
    let cwd = "C:\\Documents and Settings\\Administrator", color = "#c0c0c0";
    const files = {
      "C:\\": ["Documents and Settings    <DIR>", "Program Files             <DIR>", "WINDOWS                   <DIR>", "AUTOEXEC.BAT                  0", "boot.ini                    211"],
      "C:\\Documents and Settings\\Administrator": ["桌面                      <DIR>", "My Documents              <DIR>", "Favorites                 <DIR>", "Local Settings            <DIR>", "NTUSER.DAT             262144"],
      "C:\\WINDOWS": ["system32                  <DIR>", "Temp                      <DIR>", "explorer.exe            1032192", "notepad.exe               69120", "regedit.exe              143360"],
      "C:\\WINDOWS\\system32": ["drivers                   <DIR>", "config                    <DIR>", "cmd.exe                 388608", "calc.exe                114688", "taskmgr.exe             135680", "kernel32.dll            995328"],
      "C:\\Program Files": ["Internet Explorer         <DIR>", "Windows Media Player      <DIR>", "Common Files              <DIR>"],
      "D:\\": ["游戏                      <DIR>", "下载                      <DIR>", "电影                      <DIR>"],
      "D:\\游戏": ["红色警戒2                 <DIR>", "扫雷.exe                 124928", "纸牌接龙.exe             389120"]
    };
    const print = (text = "", className = "") => { const line = document.createElement("div"); line.className = className; line.textContent = text; output.appendChild(line); output.scrollTop = output.scrollHeight; };
    const setPrompt = () => prompt.textContent = `${cwd}>`;
    const resolvePath = target => Object.keys(files).find(key => key.toLowerCase() === target.toLowerCase());
    const normalizePath = value => {
      const raw = value.replace(/^\/d\s+/i, "").replace(/^"|"$/g, "").trim();
      if (!raw) return cwd; if (/^[A-Za-z]:\\?$/.test(raw)) return raw[0].toUpperCase() + ":\\";
      if (raw === "\\" || raw === "/") return `${cwd[0]}:\\`;
      if (raw === "..") { const index = cwd.lastIndexOf("\\"); return index <= 2 ? cwd.slice(0, 3) : cwd.slice(0, index); }
      if (/^[A-Za-z]:\\/.test(raw)) return raw.replace(/\\$/, ""); if (raw.startsWith("\\")) return `${cwd[0]}:${raw}`; return `${cwd.replace(/\\+$/, "")}\\${raw}`;
    };
    const commandHelp = ["HELP        显示支持的命令", "DIR         显示目录中的文件和子目录", "CD          显示或更改当前目录", "CLS         清除屏幕", "VER         显示 Windows 版本", "IPCONFIG    显示网络配置", "PING        测试网络连接", "TASKLIST    显示正在运行的进程", "START       启动程序或打开网址", "COLOR       设置控制台颜色，例如 COLOR 0A", "TITLE       设置窗口标题", "DATE/TIME   显示当前日期或时间", "ECHO        显示消息", "WHOAMI      显示当前用户", "EXIT        关闭命令提示符"];
    const run = raw => {
      const value = raw.trim(), [commandRaw, ...args] = value.split(/\s+/), command = (commandRaw || "").toLowerCase(), argument = args.join(" ");
      print(`${cwd}>${raw}`);
      if (!command) return;
      if (command === "help") { commandHelp.forEach(print); print("LS/PWD      DIR 和当前目录的兼容别名"); }
      else if (command === "cls") output.innerHTML = "";
      else if (command === "ver") print("Microsoft Windows XP [版本 5.1.2600]");
      else if (command === "whoami") print("SK-2005\\Administrator");
      else if (command === "date") print(`当前日期: 2005-${String(new Date().getMonth() + 1).padStart(2, "0")}-${String(new Date().getDate()).padStart(2, "0")}`);
      else if (command === "time") print(`当前时间: ${new Date().toLocaleTimeString("zh-CN")}`);
      else if (command === "echo") print(argument);
      else if (command === "pwd") print(cwd);
      else if (command === "dir" || command === "ls") {
        const cleanArgument = argument.replace(/(^|\s)-[a-z]+/gi, "").trim(), requested = cleanArgument ? normalizePath(cleanArgument) : cwd, target = resolvePath(requested), entries = files[target];
        if (!entries) print("系统找不到指定的路径。");
        else { print(` 驱动器 ${target[0]} 中的卷没有标签。`); print(` ${target} 的目录`); print(); entries.forEach(print); print(); print(`               ${entries.length} 个文件和目录`); }
      } else if (command === "cd" || command === "chdir") {
        if (!argument) print(cwd); else { const target = resolvePath(normalizePath(argument)); if (target) { cwd = target; setPrompt(); } else print("系统找不到指定的路径。"); }
      } else if (/^[a-z]:$/.test(command)) { const target = command.toUpperCase() + "\\"; if (files[target]) { cwd = target; setPrompt(); } }
      else if (command === "ipconfig") { ["Windows IP Configuration", "", "Ethernet adapter 本地连接:", "   IP Address. . . . . . . . . . . . : 192.168.1.138", "   Subnet Mask . . . . . . . . . . . : 255.255.255.0", "   Default Gateway . . . . . . . . . : 192.168.1.1"].forEach(print); }
      else if (command === "tasklist") { ["映像名称                     PID 会话名        内存使用", "========================= ====== =========== ============", "System Idle Process            0 Console          16 K", "System                         4 Console         236 K", "smss.exe                     612 Console         392 K", "explorer.exe                1380 Console      18,420 K", "iexplore.exe                2048 Console      32,116 K", "cmd.exe                     2600 Console       2,760 K"].forEach(print); }
      else if (command === "ping") {
        const host = argument || "127.0.0.1"; print(`正在 Ping ${host} 具有 32 字节的数据:`);
        [18, 21, 17, 23].forEach((ms, index) => setTimeout(() => print(`来自 ${host} 的回复: 字节=32 时间=${ms}ms TTL=54`), 250 * (index + 1)));
        setTimeout(() => { print(); print(`${host} 的 Ping 统计信息: 数据包: 已发送 = 4，已接收 = 4，丢失 = 0 (0% 丢失)`); }, 1300);
      } else if (command === "color") {
        const palette = { "0a": "#55ff55", "0b": "#55ffff", "0c": "#ff5555", "0e": "#ffff55", "07": "#c0c0c0", "0f": "#fff" }; color = palette[argument.toLowerCase()] || color; output.style.color = input.style.color = prompt.style.color = color;
      } else if (command === "title") win.setTitle(argument || "命令提示符");
      else if (command === "start") {
        const target = argument.toLowerCase(); const map = { notepad: "notepad", calc: "calculator", calculator: "calculator", taskmgr: "taskmgr", mspaint: "paint", iexplore: "ie", winmine: "minesweeper", games: "games" };
        if (map[target]) openApp(map[target]); else if (/^https?:\/\//i.test(argument)) window.open(argument, "_blank", "noopener,noreferrer"); else print("系统找不到指定的文件。");
      } else if (command === "exit") win.close();
      else print(`'${commandRaw}' 不是内部或外部命令，也不是可运行的程序或批处理文件。`);
    };
    ["Microsoft Windows XP [版本 5.1.2600]", "(C) 版权所有 1985-2001 Microsoft Corp.", ""].forEach(print); setPrompt(); input.focus();
    input.addEventListener("keydown", event => { if (event.key === "Enter") { const value = input.value; input.value = ""; run(value); } });
    win.body.addEventListener("click", () => input.focus());
  }

  function openCalculator() {
    const win = createWindow({ title: "计算器", icon: `<img src="${asset("calculator.png")}" width="16" alt="">`, width: 276, height: 360, resizable: false });
    const keys = ["MC","MR","MS","M+","←","CE","C","±","√","7","8","9","/","%","4","5","6","*","1/x","1","2","3","-","=","0",".","+","="];
    win.body.innerHTML = `<div class="calculator-app"><div class="menu-bar"><span>查看(V)</span><span>编辑(E)</span><span>帮助(H)</span></div><input class="calc-display" value="0" readonly aria-label="计算结果"><div class="calc-memory" data-memory></div><div class="calc-keys">${keys.map((key, index) => `<button data-key="${key}" class="${key === "=" ? "equals" : ""} ${index < 4 ? "memory" : ""}">${key}</button>`).join("")}</div></div>`;
    const display = $(".calc-display", win.body), memoryIndicator = $("[data-memory]", win.body); let accumulator = 0, current = "0", operator = null, waiting = false, memory = 0;
    const show = () => display.value = current.length > 15 ? Number(current).toExponential(8) : current;
    const calculate = () => { const value = Number(current); if (operator === "+") accumulator += value; if (operator === "-") accumulator -= value; if (operator === "*") accumulator *= value; if (operator === "/") accumulator = value === 0 ? 0 : accumulator / value; current = String(accumulator); waiting = true; };
    $$("[data-key]", win.body).forEach(button => button.addEventListener("click", () => {
      const key = button.dataset.key;
      if (/^\d$/.test(key)) { current = waiting || current === "0" ? key : current + key; waiting = false; }
      else if (key === "." && !current.includes(".")) { current += "."; waiting = false; }
      else if (["+","-","*","/"].includes(key)) { if (operator && !waiting) calculate(); else accumulator = Number(current); operator = key; waiting = true; }
      else if (key === "=") { if (operator) { calculate(); operator = null; } }
      else if (key === "C") { accumulator = 0; current = "0"; operator = null; waiting = false; }
      else if (key === "CE") { current = "0"; }
      else if (key === "←") { current = current.length > 1 ? current.slice(0, -1) : "0"; }
      else if (key === "±") current = String(-Number(current));
      else if (key === "√") current = String(Math.sqrt(Math.max(0, Number(current))));
      else if (key === "%") current = String(Number(current) / 100);
      else if (key === "1/x") current = String(Number(current) ? 1 / Number(current) : 0);
      else if (key === "MC") { memory = 0; memoryIndicator.textContent = ""; }
      else if (key === "MR") current = String(memory);
      else if (key === "MS") { memory = Number(current); memoryIndicator.textContent = "M"; }
      else if (key === "M+") { memory += Number(current); memoryIndicator.textContent = "M"; }
      show();
    }));
  }

  function openTaskManager() {
    const win = createWindow({ title: "Windows 任务管理器", icon: `<img src="${asset("taskmgr.png")}" width="16" alt="">`, width: 610, height: 455 });
    win.body.innerHTML = `<div class="taskmgr-app"><div class="menu-bar"><span>文件(F)</span><span>选项(O)</span><span>查看(V)</span><span>关机(U)</span><span>帮助(H)</span></div><div class="xp-tabbar"><button class="xp-tab selected" data-tab="applications">应用程序</button><button class="xp-tab" data-tab="processes">进程</button><button class="xp-tab" data-tab="performance">性能</button></div><div class="taskmgr-view" data-view></div><div class="taskmgr-actions"><span data-summary></span><button data-new-task>新任务...</button><button data-end>结束任务</button></div></div>`;
    const view = $("[data-view]", win.body), summary = $("[data-summary]", win.body); let tab = "applications", selectedId = null, timer;
    const baseProcesses = [
      ["System Idle Process",0,"SYSTEM",16],["System",4,"SYSTEM",236],["smss.exe",612,"SYSTEM",392],["csrss.exe",688,"SYSTEM",3760],["winlogon.exe",712,"SYSTEM",4216],["services.exe",756,"SYSTEM",3520],["svchost.exe",980,"SYSTEM",14820],["explorer.exe",1380,"Administrator",18420]
    ];
    const render = () => {
      $$(".xp-tab", win.body).forEach(button => button.classList.toggle("selected", button.dataset.tab === tab));
      if (tab === "applications") {
        const current = [...windows.values()]; view.innerHTML = `<table><thead><tr><th>任务</th><th>状态</th></tr></thead><tbody>${current.map(item => `<tr data-id="${item.id}"><td>${$(".window-title", item.el).textContent}</td><td>正在运行</td></tr>`).join("")}</tbody></table>`; summary.textContent = `进程数: ${baseProcesses.length + current.length}  CPU 使用: ${Math.floor(Math.random()*12)+2}%`;
      } else if (tab === "processes") {
        const dynamic = [...windows.values()].map((item,index) => [$(".window-title", item.el).textContent.includes("Internet") ? "iexplore.exe" : "xpapp.exe",2200+index*104,"Administrator",4200+index*1900]);
        view.innerHTML = `<table><thead><tr><th>映像名称</th><th>PID</th><th>用户名</th><th>CPU</th><th>内存使用</th></tr></thead><tbody>${[...baseProcesses,...dynamic].map(row => `<tr><td>${row[0]}</td><td>${row[1]}</td><td>${row[2]}</td><td>${Math.floor(Math.random()*4)}</td><td>${row[3].toLocaleString()} K</td></tr>`).join("")}</tbody></table>`; summary.textContent = `进程数: ${baseProcesses.length + dynamic.length}`;
      } else {
        const cpu = Math.floor(Math.random()*22)+3, mem = 42 + Math.floor(Math.random()*8); view.innerHTML = `<div class="performance-grid"><section><h3>CPU 使用</h3><b>${cpu}%</b><i><em style="height:${cpu}%"></em></i></section><section><h3>PF 使用</h3><b>${mem}%</b><i><em style="height:${mem}%"></em></i></section><section class="performance-info"><p>物理内存 (K)</p><p>总数　1,048,048</p><p>可用数　${(604000-Math.floor(Math.random()*9000)).toLocaleString()}</p><p>系统缓存　382,176</p></section></div>`; summary.textContent = `CPU 使用: ${cpu}%  提交更改: 428M / 2460M`;
      }
      $$("tr[data-id]", view).forEach(row => row.addEventListener("click", () => { $$("tr", view).forEach(x => x.classList.remove("selected")); row.classList.add("selected"); selectedId = row.dataset.id; }));
    };
    $$("[data-tab]", win.body).forEach(button => button.addEventListener("click", () => { tab = button.dataset.tab; render(); }));
    $("[data-end]", win.body).addEventListener("click", () => { const target = windows.get(selectedId); if (target && target !== win) { target.close(); selectedId = null; render(); } else playTone(180, .2); });
    $("[data-new-task]", win.body).addEventListener("click", openRun);
    timer = setInterval(() => { if (tab !== "applications") render(); }, 1500); const close = win.close; win.close = () => { clearInterval(timer); close(); }; render();
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
      const map = { notepad: "notepad", mspaint: "paint", winmine: "minesweeper", iexplore: "ie", explorer: "computer", control: "control", cmd: "cmd", calc: "calculator", calculator: "calculator", taskmgr: "taskmgr", snake: "snake", tetris: "tetris", solitaire: "solitaire", ra2: "ra2", games: "games" };
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
    playTone(880, .08); playTone(1175, .13, .09);
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
    $("#clock").innerHTML = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}<small>2005/${now.getMonth() + 1}/${now.getDate()}</small>`;
    $("#clock").title = now.toLocaleString("zh-CN");
  }
  renderDesktop();
  updateClock();
  setInterval(updateClock, 1000);
})();

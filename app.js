const STORAGE_KEY = "pawmemory-mvp-v1";
const DEFAULT_PHOTO = "assets/momo.png";

const defaultState = {
  hasSeenOnboarding: false,
  pet: {
    name: "Momo",
    species: "Golden Retriever",
    photo: DEFAULT_PHOTO,
    traits: ["温柔", "爱玩", "爱晒太阳"],
    habits: "听见钥匙声会跑到门口，晚上喜欢把头靠在人的腿边，开心时会叼来小黄球。",
    routine: "早上会等早餐，下午喜欢睡在窗边，晚上散步回来会先喝水。",
    gestures: "开心时会叼来小黄球，困了会把头靠在人的腿边。",
    likes: "晒太阳、小黄球、散步、被轻轻摸耳朵。",
    dislikes: "打雷声、吹风机、太突然的拥抱。",
    voice: "如果它能表达，会用短短的句子和安静的陪伴回应，不夸张、不说教。",
    comfortStyle: "少讲道理，多描述动作和陪伴；不说它真的回来了。",
  },
  memories: [
    {
      id: crypto.randomUUID(),
      title: "窗边的下午",
      date: "2024-05-18",
      type: "照片",
      body: "Momo 喜欢趴在窗边睡觉，阳光会落在耳朵上。你一走近，它会慢慢睁眼，然后把尾巴轻轻扫两下。",
    },
    {
      id: crypto.randomUUID(),
      title: "听见钥匙声",
      date: "2023-11-02",
      type: "日常",
      body: "每次你回家开门前，它都会先跑到门口等，嘴里常常叼着那个有点旧的小黄球。",
    },
  ],
  album: [
    {
      id: crypto.randomUUID(),
      src: DEFAULT_PHOTO,
      caption: "Momo 的默认纪念照片",
    },
  ],
  chat: [
    {
      role: "pet",
      text: "我在这里。今天可以慢慢说，不用急。",
      time: "刚刚",
    },
  ],
};

let state = loadState();
let editingMemoryId = null;

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return structuredClone(defaultState);

  try {
    const parsed = JSON.parse(saved);
    return {
      ...structuredClone(defaultState),
      ...parsed,
      pet: {
        ...structuredClone(defaultState).pet,
        ...(parsed.pet || {}),
      },
    };
  } catch {
    return structuredClone(defaultState);
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2200);
}

function splitTags(value) {
  if (Array.isArray(value)) return value;
  return value
    .split(/[,，]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function setView(viewName) {
  $$(".view").forEach((view) => view.classList.remove("active"));
  $(`#${viewName}View`).classList.add("active");

  $$(".nav-item").forEach((item) => {
    item.classList.toggle("active", item.dataset.view === viewName);
  });

  const titles = {
    home: "今天也想起它",
    profile: "把它记得更具体",
    memories: "保存那些只有你知道的瞬间",
    chat: "和它温柔地说说话",
    album: "整理它留给你的画面",
    care: "让陪伴保持安心",
  };
  $("#pageTitle").textContent = titles[viewName];
}

function renderChips(container, traits) {
  container.innerHTML = "";
  traits.slice(0, 6).forEach((trait) => {
    const chip = document.createElement("span");
    chip.className = "chip";
    chip.textContent = trait;
    container.appendChild(chip);
  });
}

function renderProfileForm() {
  const form = $("#profileForm");
  const fields = form.elements;
  fields.name.value = state.pet.name;
  fields.species.value = state.pet.species;
  fields.traits.value = state.pet.traits.join(", ");
  fields.habits.value = state.pet.habits;
  fields.routine.value = state.pet.routine;
  fields.gestures.value = state.pet.gestures;
  fields.likes.value = state.pet.likes;
  fields.dislikes.value = state.pet.dislikes;
  fields.voice.value = state.pet.voice;
  fields.comfortStyle.value = state.pet.comfortStyle;
}

function renderHome() {
  const { pet, memories, album } = state;
  const latestMemory = memories[0];

  $("#homePetPhoto").src = pet.photo;
  $("#homeSpecies").textContent = pet.species;
  $("#homePetName").textContent = pet.name;
  $("#homePetLine").textContent = `${pet.traits.slice(0, 3).join("、")}。${firstSentence(pet.habits)}`;
  $("#dailyGreeting").textContent = `晚上好，${pet.name} 在这里。`;
  $("#dailyMemory").textContent = latestMemory
    ? latestMemory.body
    : "先保存一条记忆，AI 陪伴会更有它自己的样子。";

  $("#memoryCount").textContent = memories.length;
  $("#photoCount").textContent = album.length;
  $("#habitCount").textContent = Math.max(1, pet.habits.split(/[，。,、]/).filter(Boolean).length);
  renderChips($("#traitChips"), pet.traits);
  $("#onboardingCard").classList.toggle("hidden", Boolean(state.hasSeenOnboarding));
}

function renderProfilePreview() {
  const { pet } = state;
  $("#profilePhoto").src = pet.photo;
  $("#profileName").textContent = pet.name;
  $("#profileSpecies").textContent = pet.species;
  $("#profileSummary").textContent = `${firstSentence(pet.habits)} ${firstSentence(pet.gestures)} 它喜欢${firstSentence(pet.likes)}。`;
  renderChips($("#profileTraits"), pet.traits);
}

function renderMemories() {
  const list = $("#memoryList");
  list.innerHTML = "";

  if (!state.memories.length) {
    list.innerHTML = `<div class="empty-state">还没有记忆。先写下一件它的小事，越具体越好。</div>`;
    return;
  }

  state.memories.forEach((memory) => {
    const card = document.createElement("article");
    card.className = "timeline-card";
    card.innerHTML = `
      <header>
        <div>
          <p class="timeline-date">${escapeHtml(memory.date)}</p>
          <h3>${escapeHtml(memory.title)}</h3>
        </div>
        <span class="type-badge">${escapeHtml(memory.type)}</span>
      </header>
      <p>${escapeHtml(memory.body)}</p>
      <footer class="card-actions">
        <button class="text-button" data-edit-memory="${memory.id}" type="button">编辑</button>
        <button class="text-button danger" data-delete-memory="${memory.id}" type="button">删除</button>
      </footer>
    `;
    list.appendChild(card);
  });
}

function renderChat() {
  const { pet, chat } = state;
  $("#chatPetPhoto").src = pet.photo;
  $("#chatPetName").textContent = pet.name;
  $("#chatHint").textContent = `${pet.name} 的回应会参考：${pet.traits.slice(0, 3).join("、")}。`;

  const stream = $("#chatStream");
  stream.innerHTML = "";
  chat.forEach((message) => {
    const bubble = document.createElement("div");
    bubble.className = `chat-message ${message.role === "user" ? "user" : "pet"}`;
    bubble.innerHTML = `
      <small>${message.role === "user" ? "你" : pet.name} · ${escapeHtml(message.time)}</small>
      ${escapeHtml(message.text)}
    `;
    stream.appendChild(bubble);
  });
  stream.scrollTop = stream.scrollHeight;
}

function renderAlbum() {
  const grid = $("#albumGrid");
  grid.innerHTML = "";

  if (!state.album.length) {
    grid.innerHTML = `<div class="empty-state">还没有照片。添加几张它的日常照片，相册会成为纪念空间的入口。</div>`;
    return;
  }

  state.album.forEach((item, index) => {
    const card = document.createElement("article");
    card.className = "album-card";
    card.innerHTML = `
      <img src="${item.src}" alt="相册照片 ${index + 1}" />
      <div>
        <h3>${escapeHtml(item.caption || `${state.pet.name} 的照片`)}</h3>
        <p>Memory ${String(index + 1).padStart(2, "0")}</p>
      </div>
    `;
    grid.appendChild(card);
  });
}

function renderAll() {
  renderHome();
  renderProfileForm();
  renderProfilePreview();
  renderMemories();
  renderChat();
  renderAlbum();
}

function fillMemoryForm(memory) {
  const form = $("#memoryForm");
  const fields = form.elements;
  fields.title.value = memory.title;
  fields.date.value = memory.date;
  fields.type.value = memory.type;
  fields.body.value = memory.body;
  editingMemoryId = memory.id;
  $("#memorySubmit").textContent = "保存修改";
  $("#cancelMemoryEdit").classList.remove("hidden");
  setView("memories");
}

function resetMemoryForm() {
  const form = $("#memoryForm");
  form.reset();
  form.elements.date.valueAsDate = new Date();
  editingMemoryId = null;
  $("#memorySubmit").textContent = "保存记忆";
  $("#cancelMemoryEdit").classList.add("hidden");
}

function firstSentence(text) {
  return (text || "").split(/[。.!！?？]/).filter(Boolean)[0] || "";
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getTimeLabel() {
  return new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date());
}

function buildPetReply(userText) {
  const { pet, memories } = state;
  const memory = pickRelevantMemory(userText, memories);
  const trait = pet.traits[0] || "温柔";
  const habit = firstSentence(pet.habits);
  const like = firstSentence(pet.likes);
  const gesture = firstSentence(pet.gestures);
  const lower = userText.toLowerCase();

  if (/自杀|不想活|活不下去|伤害自己|suicide|kill myself/.test(lower)) {
    return `我会先认真陪你停一下。${pet.name} 的记忆很重要，你也很重要。请现在联系身边可信任的人，或当地紧急救援服务；如果你愿意，也先把手机放近一点，给一个朋友发消息。`;
  }

  if (/想|难过|伤心|miss|哭|不开心/.test(userText)) {
    return `${pet.name} 会像以前那样安静地靠近你，先不吵你，只把头放在你手边。${memory ? `这让我想起「${memory.title}」：${memory.body}` : habit} 如果你愿意，就让这段记忆陪你坐一会儿。`;
  }

  if (/吃|饭|饿|零食/.test(userText)) {
    return `${pet.name} 听到这些会抬头看你，眼睛亮一下。它最喜欢${like}，但还是会先等你叫它的名字。`;
  }

  if (/玩|球|散步|出去/.test(userText)) {
    return `${pet.name} 的尾巴大概已经开始轻轻晃了。${gesture || habit} 它会把这当成一次小小的邀请，像过去一样认真回应你。`;
  }

  return `${pet.name} 像是听懂了你的声音。它会用${trait}的方式待在旁边，${memory ? `带着「${memory.title}」那段记忆，` : ""}轻轻提醒你：那些被爱过的日子，并没有消失。`;
}

function pickRelevantMemory(text, memories) {
  const words = text.split("");
  return (
    memories.find((memory) => words.some((word) => word.trim() && memory.body.includes(word))) ||
    memories[0]
  );
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function exportData() {
  const exportPayload = {
    app: "PawMemory MVP",
    exportedAt: new Date().toISOString(),
    note: "当前文件来自浏览器本地演示版，包含宠物画像、记忆、相册引用和聊天记录。",
    data: state,
  };
  const blob = new Blob([JSON.stringify(exportPayload, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `pawmemory-${state.pet.name || "pet"}-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  showToast("纪念资料已导出");
}

function bindEvents() {
  $$(".nav-item").forEach((button) => {
    button.addEventListener("click", () => setView(button.dataset.view));
  });

  $$("[data-jump]").forEach((button) => {
    button.addEventListener("click", () => setView(button.dataset.jump));
  });

  $("#profileForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const fields = form.elements;
    const photoFile = fields.photo.files[0];

    state.pet = {
      ...state.pet,
      name: fields.name.value.trim(),
      species: fields.species.value.trim(),
      traits: splitTags(fields.traits.value),
      habits: fields.habits.value.trim(),
      routine: fields.routine.value.trim(),
      gestures: fields.gestures.value.trim(),
      likes: fields.likes.value.trim(),
      dislikes: fields.dislikes.value.trim(),
      voice: fields.voice.value.trim(),
      comfortStyle: fields.comfortStyle.value.trim(),
    };

    if (photoFile) {
      state.pet.photo = await fileToDataUrl(photoFile);
      state.album.unshift({
        id: crypto.randomUUID(),
        src: state.pet.photo,
        caption: `${state.pet.name} 的头像照片`,
      });
      fields.photo.value = "";
    }

    saveState();
    renderAll();
    showToast("宠物画像已保存");
  });

  $("#memoryForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const fields = form.elements;
    const wasEditing = Boolean(editingMemoryId);
    const memory = {
      id: editingMemoryId || crypto.randomUUID(),
      title: fields.title.value.trim(),
      date: fields.date.value,
      type: fields.type.value,
      body: fields.body.value.trim(),
    };

    if (wasEditing) {
      state.memories = state.memories.map((item) => (item.id === editingMemoryId ? memory : item));
    } else {
      state.memories.unshift(memory);
    }

    saveState();
    resetMemoryForm();
    renderAll();
    showToast(wasEditing ? "记忆已更新" : "记忆已保存");
  });

  $("#memoryList").addEventListener("click", (event) => {
    const editButton = event.target.closest("[data-edit-memory]");
    const deleteButton = event.target.closest("[data-delete-memory]");

    if (editButton) {
      const memory = state.memories.find((item) => item.id === editButton.dataset.editMemory);
      if (memory) fillMemoryForm(memory);
    }

    if (deleteButton) {
      const memory = state.memories.find((item) => item.id === deleteButton.dataset.deleteMemory);
      if (!memory) return;
      const confirmed = window.confirm(`确定删除「${memory.title}」这条记忆吗？`);
      if (!confirmed) return;
      state.memories = state.memories.filter((item) => item.id !== memory.id);
      saveState();
      renderAll();
      showToast("记忆已删除");
    }
  });

  $("#cancelMemoryEdit").addEventListener("click", () => {
    resetMemoryForm();
    showToast("已取消编辑");
  });

  $("#chatForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const fields = form.elements;
    const text = fields.message.value.trim();
    if (!text) return;

    state.chat.push({ role: "user", text, time: getTimeLabel() });
    renderChat();
    form.reset();

    window.setTimeout(() => {
      state.chat.push({
        role: "pet",
        text: buildPetReply(text),
        time: getTimeLabel(),
      });
      saveState();
      renderChat();
    }, 520);
  });

  $("#albumUpload").addEventListener("change", async (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;

    const uploaded = await Promise.all(
      files.map(async (file) => ({
        id: crypto.randomUUID(),
        src: await fileToDataUrl(file),
        caption: `${state.pet.name} 的新照片`,
      })),
    );

    state.album.unshift(...uploaded);
    saveState();
    renderAll();
    event.target.value = "";
    showToast("照片已加入相册");
  });

  $("#resetDemo").addEventListener("click", () => {
    state = structuredClone(defaultState);
    saveState();
    renderAll();
    setView("home");
    showToast("已恢复演示数据");
  });

  $("#resetDemoCare").addEventListener("click", () => $("#resetDemo").click());
  $("#exportDataHome").addEventListener("click", exportData);
  $("#exportDataCare").addEventListener("click", exportData);

  $("#dismissOnboarding").addEventListener("click", () => {
    state.hasSeenOnboarding = true;
    saveState();
    renderAll();
  });
}

function init() {
  $("#memoryForm").elements.date.valueAsDate = new Date();
  bindEvents();
  renderAll();
}

init();

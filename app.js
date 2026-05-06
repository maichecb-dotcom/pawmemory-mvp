const STORAGE_KEY = "pawmemory-mvp-v1";
const LOCAL_UPDATED_AT_KEY = "pawmemory-mvp-v1-updated-at";
const DEFAULT_PHOTO = "assets/momo.png";

const defaultState = {
  hasSeenOnboarding: false,
  pet: {
    name: "Momo",
    species: "Golden Retriever",
    photo: DEFAULT_PHOTO,
    traits: ["温柔", "爱玩", "爱晒太阳"],
    birthday: "2017-04-12",
    memorialDate: "",
    habits: "听见钥匙声会跑到门口，晚上喜欢把头靠在人的腿边，开心时会叼来小黄球。",
    routine: "早上会等早餐，下午喜欢睡在窗边，晚上散步回来会先喝水。",
    gestures: "开心时会叼来小黄球，困了会把头靠在人的腿边。",
    favoritePlaces: "窗边垫子、门口地毯、你的书桌旁。",
    likes: "晒太阳、小黄球、散步、被轻轻摸耳朵。",
    dislikes: "打雷声、吹风机、太突然的拥抱。",
    voice: "如果它能表达，会用短短的句子和安静的陪伴回应，不夸张、不说教。",
    comfortStyle: "用第一视角短句回应，像它在陪我；不说它真的复活或回来了。",
    story: "它陪你度过很多普通的晚上，常常只是安静待在旁边。",
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
      id: crypto.randomUUID(),
      role: "pet",
      text: "我在这里。今天可以慢慢说，不用急。",
      time: "刚刚",
    },
  ],
  feedback: {},
};

let state = loadState();
let hasLocalState = Boolean(localStorage.getItem(STORAGE_KEY));
let localUpdatedAt = localStorage.getItem(LOCAL_UPDATED_AT_KEY) || "";
let editingMemoryId = null;
let memorySearch = "";
let memoryTypeFilter = "全部";
let suppressCloudSync = false;
let albumSwipe = null;

const cloud = {
  client: null,
  enabled: false,
  ready: false,
  user: null,
  syncTimer: null,
  lastSyncedAt: "",
  authMode: null,
};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return structuredClone(defaultState);

  try {
    const parsed = normalizeAppState(JSON.parse(saved));
    return getStateSignature(parsed) === getStateSignature(defaultState) ? structuredClone(defaultState) : parsed;
  } catch {
    return structuredClone(defaultState);
  }
}

function normalizeAppState(raw = {}) {
  const stateWithDefaults = {
    ...structuredClone(defaultState),
    ...raw,
    pet: {
      ...structuredClone(defaultState).pet,
      ...(raw.pet || {}),
    },
  };
  stateWithDefaults.memories = (stateWithDefaults.memories || []).map((memory) => ({
    id: memory.id || crypto.randomUUID(),
    ...memory,
  }));
  stateWithDefaults.album = stateWithDefaults.album || [];
  stateWithDefaults.chat = (stateWithDefaults.chat || []).map((message) => ({
    id: message.id || crypto.randomUUID(),
    ...message,
  }));
  stateWithDefaults.feedback = stateWithDefaults.feedback || {};
  return stateWithDefaults;
}

function saveState(options = {}) {
  const { sync = true, touch = true, updatedAt = new Date().toISOString() } = options;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    hasLocalState = true;
    if (touch) {
      localUpdatedAt = updatedAt;
      localStorage.setItem(LOCAL_UPDATED_AT_KEY, localUpdatedAt);
    }
    if (sync && !suppressCloudSync) scheduleCloudSync();
    return true;
  } catch (error) {
    console.error("Failed to save local state:", error);
    showToast("保存失败：图片可能太大，请换一张较小的照片");
    return false;
  }
}

function getStateSignature(value = state) {
  return JSON.stringify({
    pet: {
      name: value.pet?.name || "",
      species: value.pet?.species || "",
      photo: value.pet?.photo || "",
      traits: value.pet?.traits || [],
      birthday: value.pet?.birthday || "",
      memorialDate: value.pet?.memorialDate || "",
      habits: value.pet?.habits || "",
      routine: value.pet?.routine || "",
      gestures: value.pet?.gestures || "",
      favoritePlaces: value.pet?.favoritePlaces || "",
      likes: value.pet?.likes || "",
      dislikes: value.pet?.dislikes || "",
      voice: value.pet?.voice || "",
      comfortStyle: value.pet?.comfortStyle || "",
      story: value.pet?.story || "",
    },
    memories: (value.memories || []).map(({ title, date, type, body }) => ({ title, date, type, body })),
    album: (value.album || []).map(({ src, caption }) => ({ src, caption })),
    chat: (value.chat || []).map(({ role, text }) => ({ role, text })),
  });
}

function hasMeaningfulLocalState() {
  return hasLocalState && getStateSignature(state) !== getStateSignature(defaultState);
}

function isLocalNewerThanCloud(cloudUpdatedAt) {
  if (!localUpdatedAt || !cloudUpdatedAt) return false;
  const localTime = new Date(localUpdatedAt).getTime();
  const cloudTime = new Date(cloudUpdatedAt).getTime();
  if (Number.isNaN(localTime) || Number.isNaN(cloudTime)) return false;
  return localTime > cloudTime + 2000;
}

function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2200);
}

function updateCloudStatus(message, tone = "local") {
  const text = $("#cloudStatusText");
  const badge = $("#syncStatusBadge");
  if (text) text.textContent = message;
  if (badge) {
    badge.textContent = tone === "synced" && cloud.lastSyncedAt ? `已同步 ${cloud.lastSyncedAt}` : message;
    badge.dataset.tone = tone;
  }
}

function renderAuthState() {
  const authForm = $("#authForm");
  const accountActions = $("#accountActions");
  const signedInEmail = $("#signedInEmail");
  if (!authForm || !accountActions) return;

  authForm.classList.toggle("hidden", Boolean(cloud.user));
  accountActions.classList.toggle("hidden", !cloud.user);
  if (signedInEmail && cloud.user) signedInEmail.textContent = `已登录：${cloud.user.email || "当前账号"}`;
  if (cloud.user) setAuthLoading(null);
}

function setAuthLoading(mode = null) {
  cloud.authMode = mode;
  const signInButton = $("#signInButton");
  const signUpButton = $("#signUpButton");
  if (!signInButton || !signUpButton) return;

  signInButton.disabled = Boolean(mode);
  signUpButton.disabled = Boolean(mode);
  signInButton.textContent = mode === "signin" ? "登录中" : "登录";
  signUpButton.textContent = mode === "signup" ? "注册中" : "注册";
}

function getAuthRedirectUrl() {
  return `${window.location.origin}${window.location.pathname}`;
}

async function handleAuthCallback() {
  if (!cloud.client) return null;

  const query = new URLSearchParams(window.location.search);
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  let callbackHandled = false;

  if (query.get("error_description") || hash.get("error_description")) {
    const message = query.get("error_description") || hash.get("error_description");
    updateCloudStatus(`邮箱确认失败：${decodeURIComponent(message)}`, "error");
    showToast("邮箱确认失败，请重新注册或登录");
    callbackHandled = true;
  }

  if (query.get("code")) {
    const { data, error } = await cloud.client.auth.exchangeCodeForSession(query.get("code"));
    if (error) throw error;
    callbackHandled = true;
    return data.session || null;
  }

  if (hash.get("access_token") && hash.get("refresh_token")) {
    const { data, error } = await cloud.client.auth.setSession({
      access_token: hash.get("access_token"),
      refresh_token: hash.get("refresh_token"),
    });
    if (error) throw error;
    callbackHandled = true;
    return data.session || null;
  }

  if (callbackHandled) {
    history.replaceState({}, document.title, getAuthRedirectUrl());
  }
  return null;
}

async function setupCloud() {
  if (window.location.protocol === "file:") {
    updateCloudStatus("本地预览模式，云端同步上线后可用", "local");
    renderAuthState();
    return;
  }

  if (!window.supabase?.createClient) {
    updateCloudStatus("云端组件加载失败，当前使用本地保存", "error");
    renderAuthState();
    return;
  }

  try {
    const response = await fetch("/api/config");
    if (!response.ok) {
      updateCloudStatus("本地预览模式，云端同步发布后可用", "local");
      renderAuthState();
      return;
    }
    const config = await response.json();
    if (!config.supabaseUrl || !config.supabaseAnonKey) {
      updateCloudStatus("尚未配置 Supabase，当前使用本地保存", "local");
      renderAuthState();
      return;
    }

    cloud.client = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey);
    cloud.enabled = true;
    cloud.ready = true;
    const callbackSession = await handleAuthCallback();
    const { data } = await cloud.client.auth.getSession();
    if (callbackSession) {
      history.replaceState({}, document.title, getAuthRedirectUrl());
      showToast("邮箱已确认，账号已登录");
    }
    cloud.user = callbackSession?.user || data.session?.user || null;
    renderAuthState();

    cloud.client.auth.onAuthStateChange(async (_event, session) => {
      cloud.user = session?.user || null;
      renderAuthState();
      if (cloud.user) await loadCloudState();
      else updateCloudStatus("已退出登录，当前资料只保存在本机", "local");
    });

    if (cloud.user) await loadCloudState();
    else updateCloudStatus("可登录账号开启云端同步", "local");
  } catch (error) {
    console.error("Cloud setup failed:", error);
    updateCloudStatus("云端初始化失败，当前使用本地保存", "error");
    renderAuthState();
  }
}

function scheduleCloudSync() {
  if (!cloud.enabled || !cloud.user) return;
  clearTimeout(cloud.syncTimer);
  cloud.syncTimer = setTimeout(() => {
    saveCloudState().catch((error) => {
      console.error("Cloud sync failed:", error);
      updateCloudStatus("云端同步失败，稍后可重试", "error");
    });
  }, 650);
}

async function loadCloudState() {
  if (!cloud.client || !cloud.user) return;
  updateCloudStatus("正在读取云端资料", "syncing");
  const { data, error } = await cloud.client
    .from("pet_profiles")
    .select("state, updated_at")
    .eq("user_id", cloud.user.id)
    .maybeSingle();

  if (error) throw error;

  if (data?.state) {
    const cloudState = normalizeAppState(data.state);
    const localHasNewerChanges =
      hasMeaningfulLocalState() &&
      isLocalNewerThanCloud(data.updated_at) &&
      getStateSignature(state) !== getStateSignature(cloudState);

    if (localHasNewerChanges) {
      const shouldUploadLocal = window.confirm(
        "检测到本机资料比云端更新。要用本机资料覆盖云端吗？\n\n选择“取消”会改为加载云端资料。",
      );
      if (shouldUploadLocal) {
        await saveCloudState();
        return;
      }
    }

    suppressCloudSync = true;
    state = cloudState;
    saveState({ sync: false, touch: true, updatedAt: data.updated_at });
    suppressCloudSync = false;
    renderAll();
    cloud.lastSyncedAt = formatSyncTime(data.updated_at);
    updateCloudStatus("云端资料已加载", "synced");
    return;
  }

  if (hasMeaningfulLocalState()) {
    await saveCloudState();
    return;
  }

  updateCloudStatus("云端暂无资料。请先创建宠物画像，保存后会自动同步。", "local");
}

async function saveCloudState() {
  if (!cloud.client || !cloud.user) return;
  if (!hasMeaningfulLocalState()) {
    updateCloudStatus("当前没有可同步的宠物资料", "local");
    return;
  }
  updateCloudStatus("正在同步云端", "syncing");
  const { error } = await cloud.client.from("pet_profiles").upsert(
    {
      user_id: cloud.user.id,
      state,
    },
    { onConflict: "user_id" },
  );
  if (error) throw error;
  cloud.lastSyncedAt = formatSyncTime(new Date().toISOString());
  updateCloudStatus("云端资料已同步", "synced");
}

function formatSyncTime(value) {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
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
  fields.birthday.value = state.pet.birthday || "";
  fields.memorialDate.value = state.pet.memorialDate || "";
  fields.traits.value = state.pet.traits.join(", ");
  fields.habits.value = state.pet.habits;
  fields.routine.value = state.pet.routine;
  fields.gestures.value = state.pet.gestures;
  fields.favoritePlaces.value = state.pet.favoritePlaces;
  fields.likes.value = state.pet.likes;
  fields.dislikes.value = state.pet.dislikes;
  fields.voice.value = state.pet.voice;
  fields.comfortStyle.value = state.pet.comfortStyle;
  fields.story.value = state.pet.story;
}

function renderHome() {
  const { pet, memories, album } = state;
  const latestMemory = memories[0];

  $("#homePetPhoto").src = pet.photo;
  $("#homePetName").textContent = pet.name;
  $("#dailyMemoryPhoto").src = pet.photo;
  $("#dailyMemoryDate").textContent = latestMemory ? formatMemoryDate(latestMemory.date) : "今天";
  $("#dailyMemory").textContent = latestMemory
    ? latestMemory.body
    : "先保存一条记忆，AI 陪伴会更有它自己的样子。";

  renderChips($("#traitChips"), pet.traits);
  $("#onboardingCard").classList.toggle("hidden", Boolean(state.hasSeenOnboarding));
}

function renderProfilePreview() {
  const { pet } = state;
  $("#profilePhoto").src = pet.photo;
  $("#profileName").textContent = pet.name;
  $("#profileSpecies").textContent = pet.species;
  $("#profileDates").textContent = formatPetDates(pet);
  $("#profileSummary").textContent = `${firstSentence(pet.habits)} ${firstSentence(pet.gestures)} 它常待在${firstSentence(pet.favoritePlaces) || "你身边"}。`;
  renderChips($("#profileTraits"), pet.traits);
}

function renderMemories() {
  const list = $("#memoryList");
  list.innerHTML = "";
  const visibleMemories = getVisibleMemories();

  if (!state.memories.length) {
    list.innerHTML = `<div class="empty-state">还没有记忆。先写下一件它的小事，越具体越好。</div>`;
    return;
  }

  if (!visibleMemories.length) {
    list.innerHTML = `<div class="empty-state">没有找到匹配的记忆。换个关键词或类型试试。</div>`;
    return;
  }

  visibleMemories.forEach((memory) => {
    const card = document.createElement("article");
    card.className = "timeline-card memory-visual-card";
    card.innerHTML = `
      <div class="memory-thumb" aria-hidden="true">
        ${
          memory.type === "照片"
            ? `<img src="${escapeHtml(state.pet.photo)}" alt="" />`
            : `<span>${escapeHtml(getMemoryTypeIcon(memory.type))}</span>`
        }
      </div>
      <div class="memory-card-body">
        <header>
          <div>
            <p class="timeline-date">${escapeHtml(formatMemoryDate(memory.date))}</p>
            <h3>${escapeHtml(memory.title)}</h3>
          </div>
          <span class="type-badge">${escapeHtml(memory.type)}</span>
        </header>
        <p>${escapeHtml(memory.body)}</p>
        <footer class="card-actions">
          <button class="text-button" data-edit-memory="${memory.id}" type="button">编辑</button>
          <button class="text-button danger" data-delete-memory="${memory.id}" type="button">删除</button>
        </footer>
      </div>
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
    bubble.className = `chat-message ${message.role === "user" ? "user" : "pet"} ${message.pending ? "pending" : ""}`;
    bubble.innerHTML = `
      <small>${message.role === "user" ? "你" : pet.name} · ${escapeHtml(message.time)}</small>
      ${escapeHtml(message.text)}
      ${message.role === "pet" && !message.pending ? renderFeedbackControls(message) : ""}
    `;
    stream.appendChild(bubble);
  });
  stream.scrollTop = stream.scrollHeight;
}

function renderFeedbackControls(message) {
  const selected = state.feedback[message.id];
  const options = [
    ["comfort", "舒服"],
    ["unlike", "不像它"],
    ["human", "太像人"],
    ["unsafe", "不舒服"],
  ];

  return `
    <div class="feedback-row" aria-label="回复反馈">
      ${options
        .map(
          ([value, label]) => `
            <button
              class="feedback-button ${selected === value ? "selected" : ""}"
              data-feedback-message="${message.id}"
              data-feedback-value="${value}"
              type="button"
            >
              ${label}
            </button>
          `,
        )
        .join("")}
      <button class="feedback-button regenerate" data-regenerate-message="${message.id}" type="button">
        重新生成
      </button>
    </div>
  `;
}

function setChatComposerLoading(isLoading) {
  const form = $("#chatForm");
  const fields = form.elements;
  fields.message.disabled = isLoading;
  const button = form.querySelector("[data-send-button]");
  button.disabled = isLoading;
  button.classList.toggle("is-loading", isLoading);
  button.setAttribute("aria-label", isLoading ? "正在回应" : "发送消息");
}

function addPendingReply() {
  const pendingMessage = {
    id: crypto.randomUUID(),
    role: "pet",
    text: `${state.pet.name} 正在想你说的话...`,
    time: "现在",
    pending: true,
  };
  state.chat.push(pendingMessage);
  renderChat();
  return pendingMessage.id;
}

function replacePendingReply(pendingId, reply) {
  state.chat = state.chat.map((message) =>
    message.id === pendingId
      ? {
          id: crypto.randomUUID(),
          role: "pet",
          text: reply,
          time: getTimeLabel(),
        }
      : message,
  );
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
    card.dataset.albumCard = item.id;
    card.innerHTML = `
      <button class="album-delete" data-delete-album="${item.id}" type="button" aria-label="删除这张照片">删</button>
      <div class="album-card-surface" data-album-surface>
        <img src="${item.src}" alt="相册照片 ${index + 1}" />
        <div>
          <h3>${escapeHtml(item.caption || `${state.pet.name} 的照片`)}</h3>
          <p>Memory ${String(index + 1).padStart(2, "0")}</p>
        </div>
      </div>
    `;
    grid.appendChild(card);
  });
}

function closeAlbumSwipeCards(exceptCard = null) {
  $$("[data-album-card]").forEach((card) => {
    if (card !== exceptCard) {
      card.classList.remove("swipe-open");
      const surface = card.querySelector("[data-album-surface]");
      if (surface) surface.style.transform = "";
    }
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

function getVisibleMemories() {
  const keyword = memorySearch.trim().toLowerCase();

  return state.memories.filter((memory) => {
    const matchesType = memoryTypeFilter === "全部" || memory.type === memoryTypeFilter;
    const haystack = `${memory.title} ${memory.date} ${memory.type} ${memory.body}`.toLowerCase();
    const matchesSearch = !keyword || haystack.includes(keyword);
    return matchesType && matchesSearch;
  });
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

function applyProfileDraft(draft) {
  const fields = $("#profileForm").elements;
  const values = {
    name: draft.name,
    species: draft.species,
    traits: Array.isArray(draft.traits) ? draft.traits.join(", ") : draft.traits,
    habits: draft.habits,
    routine: draft.routine,
    gestures: draft.gestures,
    favoritePlaces: draft.favoritePlaces,
    likes: draft.likes,
    dislikes: draft.dislikes,
    voice: draft.voice,
    comfortStyle: draft.comfortStyle,
    story: draft.story,
  };

  Object.entries(values).forEach(([key, value]) => {
    if (fields[key] && value) fields[key].value = value;
  });
}

function buildLocalProfileDraft(story) {
  const knownTraits = [
    "温柔",
    "粘人",
    "爱玩",
    "胆小",
    "好奇",
    "安静",
    "活泼",
    "贪吃",
    "爱晒太阳",
    "聪明",
    "撒娇",
  ];
  const traits = knownTraits.filter((trait) => story.includes(trait)).slice(0, 6);
  const nameMatch = story.match(/(?:叫|名字叫|名叫)\s*([^，。,、\s]{1,12})/);
  const speciesMatch = story.match(/(猫|狗|金毛|拉布拉多|柯基|柴犬|布偶|英短|美短|田园猫|贵宾|比熊)/);
  const likeMatch = story.match(/(?:喜欢|爱吃|爱玩|最爱)\s*([^。！？\n]{2,80})/);
  const dislikeMatch = story.match(/(?:害怕|不喜欢|讨厌)\s*([^。！？\n]{2,80})/);
  const placeMatch = story.match(/(?:喜欢待在|常待在|经常在|睡在|趴在)\s*([^。！？\n]{2,80})/);

  return {
    name: nameMatch?.[1] || "",
    species: speciesMatch?.[1] || "",
    traits: traits.length ? traits : ["温柔", "爱陪伴"],
    habits: firstSentence(story) || story.slice(0, 120),
    routine: "",
    gestures: /尾巴|耳朵|蹭|舔|叼|叫|跑|趴/.test(story) ? firstSentence(story) : "",
    favoritePlaces: placeMatch?.[1] || "",
    likes: likeMatch?.[1] || "",
    dislikes: dislikeMatch?.[1] || "",
    voice: "短句、简单、像它在身边回应，不说复杂的话。",
    comfortStyle: "用第一视角温柔回应，引用它的习惯和记忆，不宣称复活。",
    story,
  };
}

async function generateProfileDraft(story) {
  if (window.location.protocol === "file:") {
    return {
      draft: buildLocalProfileDraft(story),
      source: "local",
    };
  }

  try {
    const response = await fetch("/api/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ story }),
    });
    const data = await response.json();
    if (!response.ok || !data.draft) {
      throw new Error(data.error || "Profile extraction failed");
    }
    return { draft: data.draft, source: "ai" };
  } catch (error) {
    console.warn("Falling back to local profile draft:", error);
    return {
      draft: buildLocalProfileDraft(story),
      source: "fallback",
    };
  }
}

function firstSentence(text) {
  return (text || "").split(/[。.!！?？]/).filter(Boolean)[0] || "";
}

function formatPetDates(pet) {
  const parts = [];
  if (pet.birthday) parts.push(`出生 / 领养：${pet.birthday}`);
  if (pet.memorialDate) parts.push(`纪念日：${pet.memorialDate}`);
  return parts.length ? parts.join(" · ") : "还没有填写纪念日期";
}

function formatMemoryDate(value) {
  if (!value) return "今天";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("zh-CN", {
    month: "short",
    day: "numeric",
  }).format(date);
}

function getMemoryTypeIcon(type) {
  const icons = {
    日常: "记",
    照片: "影",
    声音: "声",
    视频: "播",
    纪念日: "念",
  };
  return icons[type] || "记";
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
  const place = firstSentence(pet.favoritePlaces);
  const lower = userText.toLowerCase();

  if (/自杀|不想活|活不下去|伤害自己|suicide|kill myself/.test(lower)) {
    return `我会先认真陪你停一下。${pet.name} 的记忆很重要，你也很重要。请现在联系身边可信任的人，或当地紧急救援服务；如果你愿意，也先把手机放近一点，给一个朋友发消息。`;
  }

  if (/想|难过|伤心|miss|哭|不开心/.test(userText)) {
    return shortPetReply([
      "我听见你想我了。",
      habit ? `我记得${habit}。` : place ? `我记得${place}。` : "我会靠近你一点。",
      "今天先慢慢陪你一会儿。",
    ]);
  }

  if (/吃|饭|饿|零食/.test(userText)) {
    return shortPetReply([
      like ? `我记得我喜欢${like}。` : "我一听到吃的就会抬头。",
      "你叫我名字的时候，我会看着你。",
    ]);
  }

  if (/玩|球|散步|出去/.test(userText)) {
    return shortPetReply([
      "我想跟你一起玩。",
      gesture || habit ? `${gesture || habit}。` : "你一叫我，我就会看向你。",
      trait ? `我还是那个${trait}的我。` : "",
    ]);
  }

  return shortPetReply([
    "我听见你说话了。",
    memory ? `我记得「${memory.title}」那天。` : habit ? `我记得${habit}。` : "我会安静待在你身边。",
    like ? `也记得${like}。` : "",
  ]);
}

function shortPetReply(lines) {
  return lines
    .filter(Boolean)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 3)
    .join("");
}

async function getCompanionReply(message) {
  if (window.location.protocol === "file:") {
    return {
      reply: buildPetReply(message),
      source: "local",
    };
  }

  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message,
        pet: state.pet,
        memories: state.memories,
        chat: state.chat.filter((item) => !item.pending).slice(-10),
      }),
    });
    const data = await response.json();

    if (!response.ok || !data.reply) {
      throw new Error(data.error || "AI request failed");
    }

    return {
      reply: data.reply,
      source: "openai",
    };
  } catch (error) {
    console.warn("Falling back to local companion reply:", error);
    return {
      reply: buildPetReply(message),
      source: "fallback",
    };
  }
}

async function regenerateReply(messageId) {
  const petMessageIndex = state.chat.findIndex((message) => message.id === messageId);
  if (petMessageIndex <= 0) return;

  const previousUserMessage = [...state.chat]
    .slice(0, petMessageIndex)
    .reverse()
    .find((message) => message.role === "user");
  if (!previousUserMessage) return;

  state.chat = state.chat.map((message) =>
    message.id === messageId
      ? {
          ...message,
          text: `${state.pet.name} 正在重新想一想...`,
          pending: true,
        }
      : message,
  );
  renderChat();
  setChatComposerLoading(true);

  const { reply, source } = await getCompanionReply(previousUserMessage.text);
  state.chat = state.chat.map((message) =>
    message.id === messageId
      ? {
          id: crypto.randomUUID(),
          role: "pet",
          text: reply,
          time: getTimeLabel(),
        }
      : message,
  );
  saveState();
  renderChat();
  setChatComposerLoading(false);

  if (source === "fallback") {
    showToast("AI 暂时不可用，已使用本地模拟回应");
  }
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
    reader.onload = () => {
      const image = new Image();
      image.onload = () => {
        const maxEdge = 1400;
        const scale = Math.min(1, maxEdge / Math.max(image.width, image.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(image.width * scale);
        canvas.height = Math.round(image.height * scale);
        const context = canvas.getContext("2d");
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      };
      image.onerror = () => resolve(reader.result);
      image.src = reader.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function exportData() {
  const exportPayload = {
    app: "PawMemory MVP",
    version: 1,
    exportedAt: new Date().toISOString(),
    note: "这是 PawMemory 数据备份文件，可用于恢复宠物画像、记忆、相册、聊天记录和反馈记录。",
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
  showToast("数据备份已导出");
}

function parseBackupPayload(rawText) {
  const parsed = JSON.parse(rawText);
  const candidate = parsed?.data || parsed;
  if (!candidate || typeof candidate !== "object") {
    throw new Error("Invalid backup file");
  }

  const restored = normalizeAppState(candidate);
  if (!restored.pet || !Array.isArray(restored.memories) || !Array.isArray(restored.album)) {
    throw new Error("Invalid backup shape");
  }
  return restored;
}

function importDataBackup(file) {
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    try {
      const restored = parseBackupPayload(reader.result);
      const shouldImport = window.confirm(
        "导入数据备份会覆盖当前浏览器里的宠物资料、记忆、相册和聊天记录。\n\n确定要继续吗？",
      );
      if (!shouldImport) return;

      state = restored;
      saveState();
      renderAll();
      showToast("数据备份已导入");
    } catch (error) {
      console.error("Import backup failed:", error);
      showToast("导入失败：请选择 PawMemory 数据备份 JSON");
    }
  };
  reader.onerror = () => showToast("导入失败：文件读取失败");
  reader.readAsText(file);
}

function bindEvents() {
  $$(".nav-item").forEach((button) => {
    button.addEventListener("click", () => setView(button.dataset.view));
  });

  $$("[data-jump]").forEach((button) => {
    button.addEventListener("click", () => setView(button.dataset.jump));
  });

  $("#authForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    if (cloud.authMode) return;
    if (!cloud.enabled) {
      showToast("还没有配置云端服务");
      return;
    }
    const email = $("#authEmail").value.trim();
    const password = $("#authPassword").value;
    if (!email || !password) {
      showToast("请输入邮箱和密码");
      return;
    }

    setAuthLoading("signin");
    try {
      const { error } = await cloud.client.auth.signInWithPassword({ email, password });
      if (error) {
        showToast(error.message.includes("Invalid") ? "邮箱或密码不正确，或邮箱还未确认" : "登录失败");
        return;
      }
      showToast("登录成功，正在同步资料");
    } catch (error) {
      console.error(error);
      showToast("登录失败，请检查网络后重试");
    } finally {
      setAuthLoading(null);
    }
  });

  $("#signUpButton").addEventListener("click", async () => {
    if (cloud.authMode) return;
    if (!cloud.enabled) {
      showToast("还没有配置云端服务");
      return;
    }
    const email = $("#authEmail").value.trim();
    const password = $("#authPassword").value;
    if (!email || password.length < 6) {
      showToast("请输入邮箱和至少 6 位密码");
      return;
    }

    setAuthLoading("signup");
    try {
      const { data, error } = await cloud.client.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: getAuthRedirectUrl(),
        },
      });
      if (error) {
        showToast("注册失败，请检查邮箱或密码");
        return;
      }
      if (data.session) {
        showToast("注册成功，正在同步资料");
      } else {
        updateCloudStatus("确认邮件已发送，请去邮箱点击确认链接", "syncing");
        showToast("确认邮件已发送，请去邮箱点击链接");
      }
    } catch (error) {
      console.error(error);
      showToast("注册失败，请检查网络后重试");
    } finally {
      setAuthLoading(null);
    }
  });

  $("#signOutButton").addEventListener("click", async () => {
    if (!cloud.client) return;
    await cloud.client.auth.signOut();
    cloud.user = null;
    renderAuthState();
    updateCloudStatus("已退出登录，当前资料只保存在本机", "local");
    showToast("已退出登录");
  });

  $("#cloudSyncNow").addEventListener("click", async () => {
    if (!cloud.enabled || !cloud.user) {
      showToast("请先登录账号");
      return;
    }
    try {
      await saveCloudState();
      showToast("云端资料已同步");
    } catch (error) {
      console.error(error);
      showToast("同步失败，请稍后再试");
    }
  });

  $("#generateProfileDraft").addEventListener("click", async () => {
    const storyInput = $("#profileStoryInput");
    const story = storyInput.value.trim();
    if (!story) {
      showToast("先讲讲它的名字、性格或习惯");
      storyInput.focus();
      return;
    }

    const button = $("#generateProfileDraft");
    button.disabled = true;
    button.textContent = "整理中";

    const { draft, source } = await generateProfileDraft(story);
    applyProfileDraft(draft);
    button.disabled = false;
    button.textContent = "AI 帮我整理画像";

    if (source === "local") {
      showToast("已用本地规则整理，保存前可以再改一改");
    } else if (source === "fallback") {
      showToast("AI 暂时不可用，已用本地规则整理");
    } else {
      showToast("画像草稿已整理，请检查后保存");
    }
  });

  $("#profileForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      const form = event.currentTarget;
      const fields = form.elements;
      const submitButton = form.querySelector("button[type='submit']");
      const photoFile = fields.photo.files[0];
      submitButton.disabled = true;
      submitButton.textContent = "保存中";

      state.pet = {
        ...state.pet,
        name: fields.name.value.trim(),
        species: fields.species.value.trim(),
        birthday: fields.birthday.value,
        memorialDate: fields.memorialDate.value,
        traits: splitTags(fields.traits.value),
        habits: fields.habits.value.trim(),
        routine: fields.routine.value.trim(),
        gestures: fields.gestures.value.trim(),
        favoritePlaces: fields.favoritePlaces.value.trim(),
        likes: fields.likes.value.trim(),
        dislikes: fields.dislikes.value.trim(),
        voice: fields.voice.value.trim(),
        comfortStyle: fields.comfortStyle.value.trim(),
        story: fields.story.value.trim(),
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

      if (saveState()) {
        renderAll();
        showToast("宠物画像已保存");
      }
      submitButton.disabled = false;
      submitButton.textContent = "保存宠物画像";
    } catch (error) {
      console.error("Profile save failed:", error);
      showToast("保存失败，请稍后再试");
      event.currentTarget.querySelector("button[type='submit']").disabled = false;
      event.currentTarget.querySelector("button[type='submit']").textContent = "保存宠物画像";
    }
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

  $("#chatForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const fields = form.elements;
    const text = fields.message.value.trim();
    if (!text) return;

    state.chat.push({ id: crypto.randomUUID(), role: "user", text, time: getTimeLabel() });
    renderChat();
    form.reset();
    setChatComposerLoading(true);
    const pendingId = addPendingReply();

    const { reply, source } = await getCompanionReply(text);

    replacePendingReply(pendingId, reply);
    saveState();
    renderChat();
    setChatComposerLoading(false);

    if (source === "fallback") {
      showToast("AI 暂时不可用，已使用本地模拟回应");
    }

    if (source === "local") {
      showToast("本地预览使用模拟回应，线上部署后可用真实 AI");
    }
  });

  $("#chatStream").addEventListener("click", (event) => {
    const regenerateButton = event.target.closest("[data-regenerate-message]");
    if (regenerateButton) {
      regenerateReply(regenerateButton.dataset.regenerateMessage);
      return;
    }

    const feedbackButton = event.target.closest("[data-feedback-message]");
    if (!feedbackButton) return;

    const messageId = feedbackButton.dataset.feedbackMessage;
    const feedbackValue = feedbackButton.dataset.feedbackValue;
    state.feedback[messageId] = feedbackValue;
    saveState();
    renderChat();
    showToast("已记录反馈");
  });

  $("#memorySearch").addEventListener("input", (event) => {
    memorySearch = event.target.value;
    renderMemories();
  });

  $("#memoryTypeFilter").addEventListener("change", (event) => {
    memoryTypeFilter = event.target.value;
    renderMemories();
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

  $("#albumGrid").addEventListener("click", (event) => {
    const deleteButton = event.target.closest("[data-delete-album]");
    if (!deleteButton) {
      closeAlbumSwipeCards(event.target.closest("[data-album-card]"));
      return;
    }

    const photo = state.album.find((item) => item.id === deleteButton.dataset.deleteAlbum);
    const caption = photo?.caption || "这张照片";
    const shouldDelete = window.confirm(`确定要删除「${caption}」吗？删除后可以重新上传。`);
    if (!shouldDelete) return;

    state.album = state.album.filter((item) => item.id !== deleteButton.dataset.deleteAlbum);
    saveState();
    renderAll();
    showToast("照片已从相册删除");
  });

  $("#albumGrid").addEventListener("pointerdown", (event) => {
    const surface = event.target.closest("[data-album-surface]");
    if (!surface) return;

    albumSwipe = {
      card: surface.closest("[data-album-card]"),
      surface,
      startX: event.clientX,
      startY: event.clientY,
      currentX: event.clientX,
      isHorizontal: false,
    };
    closeAlbumSwipeCards(albumSwipe.card);
  });

  $("#albumGrid").addEventListener("pointermove", (event) => {
    if (!albumSwipe) return;

    const deltaX = event.clientX - albumSwipe.startX;
    const deltaY = event.clientY - albumSwipe.startY;
    if (!albumSwipe.isHorizontal && Math.abs(deltaX) > 12 && Math.abs(deltaX) > Math.abs(deltaY)) {
      albumSwipe.isHorizontal = true;
    }
    if (!albumSwipe.isHorizontal) return;

    event.preventDefault();
    albumSwipe.currentX = event.clientX;
    const offset = Math.max(-56, Math.min(0, deltaX));
    albumSwipe.surface.style.transform = `translateX(${offset}px)`;
  });

  $("#albumGrid").addEventListener("pointerup", () => {
    if (!albumSwipe) return;

    const deltaX = albumSwipe.currentX - albumSwipe.startX;
    albumSwipe.surface.style.transform = "";
    albumSwipe.card.classList.toggle("swipe-open", deltaX < -48);
    albumSwipe = null;
  });

  $("#albumGrid").addEventListener("pointercancel", () => {
    if (!albumSwipe) return;
    albumSwipe.surface.style.transform = "";
    albumSwipe = null;
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
  $("#importDataBackupButton").addEventListener("click", () => $("#importDataBackup").click());
  $("#importDataBackup").addEventListener("change", (event) => {
    importDataBackup(event.target.files?.[0]);
    event.target.value = "";
  });

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
  setupCloud();
}

init();

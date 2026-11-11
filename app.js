// ==========================================
// HỆ THỐNG QUẢN LÝ KHẢO SÁT ĐOÀN TNCS HỒ CHÍ MINH
// Domain: khaosat.doanthanhnien.vn
// Dữ liệu động lưu qua localStorage (Không fix cứng số liệu)
// ==========================================

const UNITS_40 = [
  "Đoàn Thanh niên Chính Phủ", "Đoàn Thanh niên Quốc Hội", "Đoàn Thanh niên Các Cơ Quan Đảng Trung Ương",
  "Đoàn Thanh niên Mặt trận Tổ quốc và các đoàn thể Trung ương", "Ban Thanh niên Công an nhân dân", "Ban Thanh niên Quân đội",
  "Tuyên Quang", "Lào Cai", "Thái Nguyên", "Phú Thọ", "Bắc Ninh", "Hưng Yên", "Hải Phòng", "Ninh Bình",
  "Quảng Trị", "Đà Nẵng", "Quảng Ngãi", "Gia Lai", "Khánh Hòa", "Lâm Đồng", "Đắk Lắk", "Thành phố Hồ Chí Minh",
  "Đồng Nai", "Tây Ninh", "Cần Thơ", "Vĩnh Long", "Đồng Tháp", "Cà Mau", "An Giang", "Hà Nội", "Thanh Hóa",
  "Lạng Sơn", "Huế", "Nghệ An", "Hà Tĩnh", "Lai Châu", "Điện Biên", "Cao Bằng", "Quảng Ninh", "Sơn La"
];

// Khởi tạo Database
let appData = {
  surveys: [],     // Danh sách biểu mẫu
  responses: [],   // Danh sách câu trả lời nộp bài
  activeSurveyId: null,
  isAdmin: false   // Quyền Quản trị CMS
};

// Đọc dữ liệu từ LocalStorage
function loadStorage() {
  const saved = localStorage.getItem('TWD_SURVEY_DB');
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      appData.surveys = parsed.surveys || [];
      appData.responses = parsed.responses || [];
      appData.activeSurveyId = parsed.activeSurveyId || null;
    } catch (e) {
      console.error("Lỗi đọc DB", e);
    }
  }
  appData.isAdmin = !!sessionStorage.getItem('TWD_IS_ADMIN');
  updateAdminUI();
}

function saveStorage() {
  localStorage.setItem('TWD_SURVEY_DB', JSON.stringify({
    surveys: appData.surveys,
    responses: appData.responses,
    activeSurveyId: appData.activeSurveyId
  }));
}

// -------------------------------------------------------------
// XỬ LÝ ĐĂNG NHẬP / ĐĂNG XUẤT CÁN BỘ QUẢN TRỊ CMS
// -------------------------------------------------------------
window.handleAdminLogin = function(e) {
  e.preventDefault();
  const u = document.getElementById('login-username').value.trim();
  const p = document.getElementById('login-password').value.trim();
  const err = document.getElementById('login-error-msg');

  // Thông tin đăng nhập CMS: admintuyengiaotwd / 26031931
  if (u === 'admintuyengiaotwd' && p === '26031931') {
    appData.isAdmin = true;
    sessionStorage.setItem('TWD_IS_ADMIN', 'true');
    err.classList.add('hidden');
    updateAdminUI();
    showToast('Đăng nhập Quản trị viên thành công! Đã mở khóa CMS.');
    window.switchTab('builder');
  } else {
    err.classList.remove('hidden');
    showToast('Tài khoản hoặc mật khẩu không đúng!', true);
  }
};

window.handleAdminLogout = function() {
  appData.isAdmin = false;
  sessionStorage.removeItem('TWD_IS_ADMIN');
  updateAdminUI();
  showToast('Đã đăng xuất khỏi cổng Quản trị.');
  window.switchTab('portal');
};

function updateAdminUI() {
  const adminElements = document.querySelectorAll('.admin-only');
  const loginBtn = document.getElementById('btn-header-login');
  const badge = document.getElementById('admin-user-badge');

  if (appData.isAdmin) {
    adminElements.forEach(el => el.classList.remove('hidden'));
    if (loginBtn) loginBtn.classList.add('hidden');
    if (badge) {
      badge.classList.remove('hidden');
      badge.classList.add('flex');
    }
  } else {
    adminElements.forEach(el => el.classList.add('hidden'));
    if (loginBtn) loginBtn.classList.remove('hidden');
    if (badge) {
      badge.classList.add('hidden');
      badge.classList.remove('flex');
    }
  }
}

// -------------------------------------------------------------
// CHUYỂN ĐỔI TAB (Portal, Builder, Publish, Analytics, Login)
// -------------------------------------------------------------
window.switchTab = function(tabId) {
  if ((tabId === 'builder' || tabId === 'publish') && !appData.isAdmin) {
    showToast('Bạn cần đăng nhập tài khoản Cán bộ Quản trị để vào mục này!', true);
    tabId = 'login';
  }

  const tabs = ['portal', 'builder', 'publish', 'analytics', 'login'];
  tabs.forEach(t => {
    const view = document.getElementById('view-' + t);
    const btn = document.getElementById('btn-tab-' + t);
    if (view) view.classList.add('hidden');
    if (btn) {
      btn.classList.remove('bg-doan-blue', 'text-white', 'shadow');
      btn.classList.add('text-slate-600', 'hover:bg-slate-200');
    }
  });

  const activeView = document.getElementById('view-' + tabId);
  const activeBtn = document.getElementById('btn-tab-' + tabId);
  if (activeView) activeView.classList.remove('hidden');
  if (activeBtn) {
    activeBtn.classList.remove('text-slate-600', 'hover:bg-slate-200');
    activeBtn.classList.add('bg-doan-blue', 'text-white', 'shadow');
  }

  if (tabId === 'portal') renderPortalView();
  if (tabId === 'builder') renderBuilderView();
  if (tabId === 'publish') renderPublishView();
  if (tabId === 'analytics') renderAnalyticsView();

  window.scrollTo({ top: 0, behavior: 'smooth' });
};

// -------------------------------------------------------------
// 1. TẠO BIỂU MẪU (FORM BUILDER) KÈM ĐỌC FILE WORD & THỜI HẠN
// -------------------------------------------------------------
let currentEditingQuestions = [];

function renderBuilderView() {
  renderQuestionsList();
  const startEl = document.getElementById('form-start-time');
  const endEl = document.getElementById('form-end-time');
  if (startEl && !startEl.value) {
    startEl.value = new Date().toISOString().slice(0, 16);
  }
  if (endEl && !endEl.value) {
    const future = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    endEl.value = future.toISOString().slice(0, 16);
  }
}

window.initNewSurvey = function() {
  if (!appData.isAdmin) {
    showToast('Vui lòng đăng nhập tài khoản Quản trị để tạo biểu mẫu mới!', true);
    window.switchTab('login');
    return;
  }
  currentEditingQuestions = [];
  const titleEl = document.getElementById('form-survey-title');
  const descEl = document.getElementById('form-survey-desc');
  if (titleEl) titleEl.value = '';
  if (descEl) descEl.value = '';
  renderQuestionsList();
  window.switchTab('builder');
};

// Đọc file Word (.docx) bóc tách câu hỏi
window.handleWordFileUpload = function(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  if (file.name.endsWith('.docx')) {
    reader.onload = function(loadEvent) {
      const arrayBuffer = loadEvent.target.result;
      if (window.mammoth) {
        mammoth.extractRawText({ arrayBuffer: arrayBuffer })
          .then(function(result) {
            parseAndGenerateQuestionsFromText(result.value, file.name);
          })
          .catch(function(err) {
            showToast('Lỗi đọc file Word: ' + err.message, true);
          });
      } else {
        showToast('Thư viện bóc tách file Word chưa sẵn sàng!', true);
      }
    };
    reader.readAsArrayBuffer(file);
  } else {
    reader.onload = function(loadEvent) {
      parseAndGenerateQuestionsFromText(loadEvent.target.result, file.name);
    };
    reader.readAsText(file);
  }
};

function parseAndGenerateQuestionsFromText(text, fileName) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length === 0) {
    showToast('File không có nội dung văn bản!', true);
    return;
  }

  const titleEl = document.getElementById('form-survey-title');
  if (titleEl) titleEl.value = lines[0].length < 150 ? lines[0] : 'PHIẾU KHẢO SÁT: ' + fileName.replace(/\.[^/.]+$/, "");

  const parsedQuestions = [];
  let currentQ = null;

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const isQuestionStart = /^(Câu\s*\d+|C\d+|\d+[\.\)])/i.test(line);

    if (isQuestionStart) {
      if (currentQ) parsedQuestions.push(currentQ);
      const isMaxSelect = line.includes('chọn tối đa');
      const maxMatch = line.match(/chọn tối đa (\d+)/i);
      const maxSelect = maxMatch ? parseInt(maxMatch[1], 10) : 2;

      currentQ = {
        id: 'q_' + (parsedQuestions.length + 1),
        title: line,
        type: isMaxSelect ? 'checkbox' : 'radio',
        maxSelect: isMaxSelect ? maxSelect : undefined,
        options: []
      };
    } else if (currentQ) {
      const isOption = /^([☐\d\w\-\*\•]+[\.\)]?|\d+\.)\s*/.test(line);
      if (isOption && line.length < 200) {
        currentQ.options.push(line.replace(/^[☐\s]+/, '').trim());
      } else if (line.toLowerCase().includes('ý kiến khác') || line.includes('…………')) {
        currentQ.options.push(line);
      }
    }
  }

  if (currentQ) parsedQuestions.push(currentQ);

  if (parsedQuestions.length > 0) {
    currentEditingQuestions = parsedQuestions;
    renderQuestionsList();
    showToast(`Đã tự động trích xuất thành công ${parsedQuestions.length} câu hỏi từ file!`);
  } else {
    showToast('Không tìm thấy cấu trúc câu hỏi rõ ràng. Đã nạp mẫu chuẩn Diễn đàn 2026!');
    window.loadSampleForumSurvey();
  }
}

// Nạp mẫu sẵn Diễn đàn 2026
window.loadSampleForumSurvey = function() {
  const titleEl = document.getElementById('form-survey-title');
  const descEl = document.getElementById('form-survey-desc');
  if (titleEl) titleEl.value = 'PHIẾU TRƯNG CẦU Ý KIẾN THANH NIÊN NĂM 2026';
  if (descEl) descEl.value = 'Phục vụ Diễn đàn “Tiếng nói tuổi trẻ - Hành động của Đoàn” năm 2026';
  
  currentEditingQuestions = [
    {
      id: 'q1',
      title: 'Câu 1. Theo bạn, nội dung giáo dục nào cần được tăng cường nhất đối với thanh niên hiện nay? (chọn tối đa 2 ý)',
      type: 'checkbox',
      maxSelect: 2,
      options: ['1. Lý tưởng cách mạng', '2. Đạo đức, lối sống', '3. Lòng yêu nước, tự hào dân tộc', '4. Giá trị sống, kỹ năng sống', '5. Nội dung khác']
    },
    {
      id: 'q2',
      title: 'Câu 2. Theo bạn, nguyên nhân chủ yếu khiến một bộ phận thanh niên thiếu lý tưởng cách mạng là gì? (chọn tối đa 3 ý)',
      type: 'checkbox',
      maxSelect: 3,
      options: ['1. Áp lực mưu sinh, kinh tế', '2. Thiếu định hướng, giáo dục phù hợp', '3. Tác động của lối sống thực dụng', '4. Tuyên truyền còn khô cứng', '5. Thiếu hình mẫu truyền cảm hứng', '6. Thanh niên ít quan tâm']
    },
    {
      id: 'q8',
      title: 'Câu 8. Trong 12 tháng qua, bạn đã tham gia hoạt động tình nguyện nào chưa?',
      type: 'radio',
      options: ['1. Thường xuyên', '2. Thỉnh thoảng', '3. Rất ít', '4. Chưa từng']
    },
    {
      id: 'q14',
      title: 'Câu 14. Mức độ quan tâm của bạn đến khởi nghiệp đổi mới sáng tạo như thế nào?',
      type: 'radio',
      options: ['1. Rất quan tâm', '2. Quan tâm', '3. Bình thường', '4. Không quan tâm']
    },
    {
      id: 'q25',
      title: 'Câu 25. Giải pháp quan trọng nhất để tạo môi trường thuận lợi cho thanh niên khởi nghiệp đổi mới sáng tạo là gì?',
      type: 'text'
    },
    {
      id: 'q35',
      title: 'Câu 35. Bạn quan tâm tới Đại hội Đảng toàn quốc lần thứ XIV như thế nào?',
      type: 'radio',
      options: ['1. Rất quan tâm', '2. Ít quan tâm', '3. Không quan tâm']
    }
  ];

  renderQuestionsList();
  showToast('Đã nạp câu hỏi mẫu Diễn đàn 2026 vào trình thiết kế!');
};

window.addQuestion = function() {
  const newQ = {
    id: 'q_' + Date.now(),
    title: 'Câu hỏi mới số ' + (currentEditingQuestions.length + 1),
    type: 'radio',
    options: ['Tùy chọn 1', 'Tùy chọn 2', 'Tùy chọn 3']
  };
  currentEditingQuestions.push(newQ);
  renderQuestionsList();
};

window.deleteQuestion = function(index) {
  currentEditingQuestions.splice(index, 1);
  renderQuestionsList();
};

function renderQuestionsList() {
  const container = document.getElementById('builder-questions-container');
  if (!container) return;

  if (currentEditingQuestions.length === 0) {
    container.innerHTML = `
      <div class="bg-white p-8 rounded-2xl border-2 border-dashed border-slate-300 text-center text-slate-400">
        <i class="fa-solid fa-file-circle-plus text-4xl mb-2 text-slate-300"></i>
        <p class="font-bold text-sm text-slate-600">Biểu mẫu này chưa có câu hỏi nào</p>
        <p class="text-xs text-slate-400 mt-1">Bấm "+ Thêm câu hỏi" hoặc bấm "Nạp mẫu Diễn đàn 2026" để bắt đầu thiết kế.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = currentEditingQuestions.map((q, idx) => `
    <div class="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
      <div class="flex items-center justify-between border-b border-slate-100 pb-3">
        <span class="text-xs font-bold text-doan-blue uppercase tracking-wider">Câu hỏi ${idx + 1}</span>
        <button onclick="deleteQuestion(${idx})" class="text-red-500 hover:text-red-700 text-xs font-bold">
          <i class="fa-solid fa-trash mr-1"></i> Xóa
        </button>
      </div>
      <div>
        <label class="block text-xs font-semibold text-slate-500 mb-1">Nội dung câu hỏi:</label>
        <input type="text" value="${q.title}" oninput="currentEditingQuestions[${idx}].title = this.value" class="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold focus:ring-2 focus:ring-doan-blue focus:outline-none">
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label class="block text-xs font-semibold text-slate-500 mb-1">Loại câu hỏi:</label>
          <select onchange="changeQuestionType(${idx}, this.value)" class="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none">
            <option value="radio" ${q.type === 'radio' ? 'selected' : ''}>Trắc nghiệm 1 lựa chọn</option>
            <option value="checkbox" ${q.type === 'checkbox' ? 'selected' : ''}>Hộp kiểm nhiều lựa chọn</option>
            <option value="text" ${q.type === 'text' ? 'selected' : ''}>Tự luận ngắn / Góp ý kiến</option>
          </select>
        </div>
        ${q.type === 'checkbox' ? `
          <div>
            <label class="block text-xs font-semibold text-slate-500 mb-1">Giới hạn chọn tối đa (Max Select):</label>
            <input type="number" min="1" value="${q.maxSelect || 2}" oninput="currentEditingQuestions[${idx}].maxSelect = parseInt(this.value) || 2" class="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold">
          </div>
        ` : ''}
      </div>
      ${q.type !== 'text' ? `
        <div class="space-y-1.5 pt-2">
          <label class="block text-[11px] font-semibold text-slate-400">Các phương án đáp án (Mỗi dòng 1 đáp án):</label>
          <textarea rows="3" oninput="currentEditingQuestions[${idx}].options = this.value.split('\\n').filter(s=>s.trim())" class="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs focus:ring-2 focus:ring-doan-blue focus:outline-none">${(q.options || []).join('\n')}</textarea>
        </div>
      ` : ''}
    </div>
  `).join('');
}

window.changeQuestionType = function(idx, newType) {
  currentEditingQuestions[idx].type = newType;
  if (newType === 'checkbox' && !currentEditingQuestions[idx].maxSelect) {
    currentEditingQuestions[idx].maxSelect = 2;
  }
  if (newType !== 'text' && (!currentEditingQuestions[idx].options || currentEditingQuestions[idx].options.length === 0)) {
    currentEditingQuestions[idx].options = ['Phương án 1', 'Phương án 2'];
  }
  renderQuestionsList();
};

function renderPublishView() {
  const emptyState = document.getElementById('publish-empty-state');
  const detailsCard = document.getElementById('publish-details-card');

  const survey = appData.surveys.find(s => s.id === appData.activeSurveyId) || appData.surveys[0];
  if (!survey) {
    if (emptyState) emptyState.classList.remove('hidden');
    if (detailsCard) detailsCard.classList.add('hidden');
    return;
  }

  if (emptyState) emptyState.classList.add('hidden');
  if (detailsCard) detailsCard.classList.remove('hidden');

  document.getElementById('publish-survey-title').innerText = survey.title;
  document.getElementById('publish-survey-desc').innerText = survey.desc;
  document.getElementById('publish-survey-count').innerText = `${survey.questions.length} câu hỏi`;
  // Tên miền chính thức khaosat.doanthanhnien.vn
  document.getElementById('publish-survey-link').value = `https://khaosat.doanthanhnien.vn/?survey=${survey.id}`;
}

// Lưu biểu mẫu vào hệ thống (Kèm thời gian hiệu lực)
window.saveSurveyForm = function() {
  const title = document.getElementById('form-survey-title').value.trim();
  const desc = document.getElementById('form-survey-desc').value.trim();
  const startTime = document.getElementById('form-start-time').value;
  const endTime = document.getElementById('form-end-time').value;

  if (!title) {
    showToast('Vui lòng nhập tiêu đề cho phiếu khảo sát!', true);
    return;
  }
  if (currentEditingQuestions.length === 0) {
    showToast('Phiếu khảo sát phải có ít nhất 01 câu hỏi!', true);
    return;
  }

  const newSurvey = {
    id: 'SURV_' + Date.now(),
    title: title,
    desc: desc || 'Khảo sát trực tuyến Đoàn TNCS Hồ Chí Minh',
    createdAt: new Date().toLocaleDateString('vi-VN'),
    startTime: startTime || null,
    endTime: endTime || null,
    questions: JSON.parse(JSON.stringify(currentEditingQuestions))
  };

  appData.surveys.unshift(newSurvey);
  appData.activeSurveyId = newSurvey.id;
  saveStorage();

  showToast('Đã lưu và xuất bản biểu mẫu khảo sát thành công!');
  window.switchTab('publish');
};

function isSurveyActive(survey) {
  if (!survey.startTime && !survey.endTime) return true;
  const now = new Date();
  if (survey.startTime && new Date(survey.startTime) > now) return false;
  if (survey.endTime && new Date(survey.endTime) < now) return false;
  return true;
}

// -------------------------------------------------------------
// 2. CỔNG KHẢO SÁT & LÀM BÀI TRỰC TIẾP (PORTAL)
// -------------------------------------------------------------
function renderPortalView() {
  const grid = document.getElementById('portal-surveys-grid');
  const emptyState = document.getElementById('portal-empty-state');
  
  const totalResponses = appData.responses.length;
  document.getElementById('stat-total-responses').innerText = totalResponses.toLocaleString('vi-VN');
  
  const distinctUnits = new Set(appData.responses.map(r => r.unit));
  document.getElementById('stat-active-units').innerText = distinctUnits.size + ' / 40';

  if (!grid) return;

  if (appData.surveys.length === 0) {
    if (emptyState) emptyState.classList.remove('hidden');
    grid.innerHTML = '';
    return;
  }

  if (emptyState) emptyState.classList.add('hidden');
  grid.innerHTML = appData.surveys.map(s => {
    const sResponses = appData.responses.filter(r => r.surveyId === s.id).length;
    const active = isSurveyActive(s);
    
    let validityHtml = '';
    if (s.endTime) {
      const endStr = new Date(s.endTime).toLocaleDateString('vi-VN');
      validityHtml = `<span class="text-[11px] text-slate-500"><i class="fa-regular fa-clock mr-1"></i>Hạn chót: <b>${endStr}</b></span>`;
    }

    return `
      <div class="bg-white rounded-2xl border-2 ${active ? 'border-doan-blue/30 shadow-md hover:shadow-xl' : 'border-slate-200 opacity-80'} transition flex flex-col overflow-hidden">
        <div class="h-2 ${active ? 'bg-doan-red' : 'bg-slate-400'} w-full"></div>
        <div class="p-6 flex-1 flex flex-col">
          <div class="flex items-center justify-between mb-3">
            <span class="px-2.5 py-1 rounded-full text-[10px] font-bold ${active ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500'}">
              <i class="fa-solid ${active ? 'fa-circle-check text-emerald-600' : 'fa-circle-xmark'} mr-1"></i>
              ${active ? 'Đang mở tiếp nhận' : 'Đã hết thời hạn'}
            </span>
            <span class="text-xs text-slate-400 font-medium">${s.createdAt}</span>
          </div>
          <h3 class="font-extrabold text-slate-900 text-base leading-snug mb-2 ${active ? 'hover:text-doan-blue cursor-pointer' : ''}" onclick="${active ? `openTakeSurveyModal('${s.id}')` : ''}">
            ${s.title}
          </h3>
          <p class="text-xs text-slate-600 line-clamp-3 mb-4 leading-relaxed">${s.desc}</p>
          
          <div class="mt-auto pt-3 border-t border-slate-100 flex items-center justify-between">
            <div class="flex flex-col">
              <span class="text-xs font-semibold text-emerald-600"><i class="fa-solid fa-users mr-1"></i> ${sResponses} lượt nộp</span>
              ${validityHtml}
            </div>
            ${active ? `
              <button onclick="openTakeSurveyModal('${s.id}')" class="bg-doan-blue hover:bg-doan-darkblue text-white text-xs font-bold px-4 py-2 rounded-xl transition flex items-center gap-1.5 shadow">
                <span>Làm bài</span> <i class="fa-solid fa-arrow-right text-[10px]"></i>
              </button>
            ` : `
              <button disabled class="bg-slate-200 text-slate-500 text-xs font-bold px-3 py-1.5 rounded-xl cursor-not-allowed">
                Đã đóng
              </button>
            `}
          </div>
        </div>
      </div>
    `;
  }).join('');
}

window.openTakeSurveyModal = function(surveyId) {
  let survey = appData.surveys.find(s => s.id === surveyId);
  if (!survey) {
    if (appData.surveys.length > 0) {
      survey = appData.surveys[0];
    } else {
      showToast('Hiện chưa có biểu mẫu nào đang mở!', true);
      return;
    }
  }

  if (!isSurveyActive(survey)) {
    showToast('Biểu mẫu khảo sát này đã hết hạn nhận ý kiến!', true);
    return;
  }

  appData.activeSurveyId = survey.id;
  document.getElementById('modal-survey-title').innerText = survey.title;
  document.getElementById('modal-survey-desc').innerText = survey.desc;

  const unitSelect = document.getElementById('modal-survey-unit');
  unitSelect.innerHTML = `<option value="">-- Chọn đơn vị Tỉnh/Thành hoặc Khối trực thuộc (40 đơn vị) --</option>` +
    UNITS_40.map(u => `<option value="${u}">${u}</option>`).join('');

  const questionsBox = document.getElementById('modal-survey-questions');
  questionsBox.innerHTML = survey.questions.map((q, idx) => {
    if (q.type === 'radio') {
      return `
        <div class="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-3">
          <label class="block text-xs font-bold text-slate-900">${q.title} <span class="text-doan-red">*</span></label>
          <div class="space-y-2 text-xs">
            ${(q.options || []).map(opt => `
              <label class="flex items-center space-x-2.5 p-2 bg-white rounded-xl border border-slate-200 cursor-pointer hover:bg-blue-50/50">
                <input type="radio" name="ans_${q.id}" value="${opt}" required class="text-doan-blue">
                <span>${opt}</span>
              </label>
            `).join('')}
          </div>
        </div>
      `;
    } else if (q.type === 'checkbox') {
      const max = q.maxSelect || 2;
      return `
        <div class="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-3 dynamic-checkbox-group" data-max="${max}">
          <label class="block text-xs font-bold text-slate-900">
            ${q.title}
            <span class="text-doan-red block text-[11px] font-semibold mt-0.5">(Chọn tối đa ${max} ý)</span>
          </label>
          <div class="space-y-2 text-xs">
            ${(q.options || []).map(opt => `
              <label class="flex items-center space-x-2.5 p-2 bg-white rounded-xl border border-slate-200 cursor-pointer hover:bg-blue-50/50">
                <input type="checkbox" name="ans_${q.id}" value="${opt}" class="text-doan-blue rounded">
                <span>${opt}</span>
              </label>
            `).join('')}
          </div>
        </div>
      `;
    } else {
      return `
        <div class="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-2">
          <label class="block text-xs font-bold text-slate-900">${q.title}</label>
          <textarea rows="3" name="ans_${q.id}" placeholder="Nhập câu trả lời hoặc ý kiến đóng góp của bạn..." class="w-full bg-white border border-slate-300 rounded-xl p-3 text-xs focus:ring-2 focus:ring-doan-blue focus:outline-none"></textarea>
        </div>
      `;
    }
  }).join('');

  document.querySelectorAll('.dynamic-checkbox-group').forEach(grp => {
    const max = parseInt(grp.getAttribute('data-max'), 10);
    const cbs = grp.querySelectorAll('input[type="checkbox"]');
    cbs.forEach(cb => {
      cb.addEventListener('change', () => {
        const checked = grp.querySelectorAll('input[type="checkbox"]:checked').length;
        if (checked >= max) {
          cbs.forEach(c => { if (!c.checked) c.disabled = true; });
        } else {
          cbs.forEach(c => c.disabled = false);
        }
      });
    });
  });

  const modal = document.getElementById('take-survey-modal');
  modal.classList.remove('hidden');
  modal.classList.add('flex');
};

window.closeTakeSurveyModal = function() {
  const modal = document.getElementById('take-survey-modal');
  modal.classList.remove('flex');
  modal.classList.add('hidden');
};

window.handleSubmitResponse = function(e) {
  e.preventDefault();
  const form = document.getElementById('take-survey-form');
  const unit = document.getElementById('modal-survey-unit').value;
  const gender = form.querySelector('input[name="ans_gender"]:checked')?.value || 'Không nêu';
  const age = form.querySelector('input[name="ans_age"]:checked')?.value || '18-22';

  if (!unit) {
    showToast('Vui lòng chọn đơn vị Tỉnh/Thành đoàn của bạn!', true);
    return;
  }

  const survey = appData.surveys.find(s => s.id === appData.activeSurveyId);
  const answers = {};
  if (survey) {
    survey.questions.forEach(q => {
      if (q.type === 'checkbox') {
        const checked = Array.from(form.querySelectorAll(`input[name="ans_${q.id}"]:checked`)).map(c => c.value);
        answers[q.id] = checked;
      } else if (q.type === 'radio') {
        answers[q.id] = form.querySelector(`input[name="ans_${q.id}"]:checked`)?.value || '';
      } else {
        answers[q.id] = form.querySelector(`textarea[name="ans_${q.id}"]`)?.value || '';
      }
    });
  }

  const responseRecord = {
    id: 'RESP_' + Date.now(),
    surveyId: appData.activeSurveyId,
    surveyTitle: survey ? survey.title : 'Khảo sát',
    unit: unit,
    gender: gender,
    age: age,
    answers: answers,
    timestamp: new Date().toLocaleTimeString('vi-VN') + ' ' + new Date().toLocaleDateString('vi-VN')
  };

  appData.responses.unshift(responseRecord);
  saveStorage();

  window.closeTakeSurveyModal();
  showToast('Đóng góp ý kiến thành công! Dữ liệu đã được nạp vào Báo cáo thống kê.');
  window.switchTab('analytics');
};

// -------------------------------------------------------------
// 3. THỐNG KÊ ĐỘNG & BÁO CÁO (ANALYTICS)
// -------------------------------------------------------------
let chartUnitsInstance = null;
let chartGenderInstance = null;

function renderAnalyticsView() {
  const totalResp = appData.responses.length;
  const emptyState = document.getElementById('analytics-empty-state');
  const content = document.getElementById('analytics-content');

  const filterSelect = document.getElementById('analytics-unit-filter');
  if (filterSelect && filterSelect.options.length <= 1) {
    UNITS_40.forEach(u => {
      const opt = document.createElement('option');
      opt.value = u;
      opt.textContent = u;
      filterSelect.appendChild(opt);
    });
  }

  if (totalResp === 0) {
    if (emptyState) emptyState.classList.remove('hidden');
    if (content) content.classList.add('hidden');
    return;
  }

  if (emptyState) emptyState.classList.add('hidden');
  if (content) content.classList.remove('hidden');

  applyAnalyticsFilter();
}

window.applyAnalyticsFilter = function() {
  const selectedUnit = document.getElementById('analytics-unit-filter')?.value || 'ALL';
  const filteredData = selectedUnit === 'ALL' 
    ? appData.responses 
    : appData.responses.filter(r => r.unit === selectedUnit);

  document.getElementById('analytics-total-count').innerText = filteredData.length;

  const unitCounts = {};
  filteredData.forEach(r => {
    unitCounts[r.unit] = (unitCounts[r.unit] || 0) + 1;
  });

  const sortedUnits = Object.entries(unitCounts).sort((a,b) => b[1] - a[1]).slice(0, 7);
  const unitLabels = sortedUnits.map(item => item[0]);
  const unitValues = sortedUnits.map(item => item[1]);

  const ctx1 = document.getElementById('chartUnitsCanvas')?.getContext('2d');
  if (ctx1) {
    if (chartUnitsInstance) chartUnitsInstance.destroy();
    chartUnitsInstance = new Chart(ctx1, {
      type: 'bar',
      data: {
        labels: unitLabels.length > 0 ? unitLabels : ['Chưa có dữ liệu'],
        datasets: [{
          label: 'Số lượt nộp',
          data: unitValues.length > 0 ? unitValues : [0],
          backgroundColor: '#005baa',
          borderRadius: 8
        }]
      },
      options: { responsive: true, maintainAspectRatio: false }
    });
  }

  const ageCounts = { 'Dưới 18': 0, '18-22': 0, '23-30': 0, 'Trên 30': 0 };
  filteredData.forEach(r => {
    if (ageCounts[r.age] !== undefined) ageCounts[r.age]++;
  });

  const ctx2 = document.getElementById('chartAgeCanvas')?.getContext('2d');
  if (ctx2) {
    if (chartGenderInstance) chartGenderInstance.destroy();
    chartGenderInstance = new Chart(ctx2, {
      type: 'doughnut',
      data: {
        labels: Object.keys(ageCounts),
        datasets: [{
          data: Object.values(ageCounts),
          backgroundColor: ['#005baa', '#ffcd00', '#da251d', '#10b981']
        }]
      },
      options: { responsive: true, maintainAspectRatio: false }
    });
  }

  const tbody = document.getElementById('analytics-log-tbody');
  if (tbody) {
    tbody.innerHTML = filteredData.slice(0, 10).map(r => `
      <tr class="hover:bg-slate-50 transition">
        <td class="p-3 text-slate-400 font-mono text-[11px]">${r.timestamp}</td>
        <td class="p-3 font-semibold text-doan-blue">${r.unit}</td>
        <td class="p-3 font-medium text-slate-700">${r.surveyTitle}</td>
        <td class="p-3 text-center">${r.gender}</td>
        <td class="p-3 text-center font-bold text-slate-600">${r.age}</td>
      </tr>
    `).join('');
  }
};

window.exportResponsesCSV = function() {
  if (appData.responses.length === 0) {
    showToast('Chưa có phản hồi nào để xuất file!', true);
    return;
  }
  let csv = "\uFEFFMã phản hồi,Thời gian,Đơn vị Tỉnh/Thành,Biểu mẫu,Giới tính,Độ tuổi\n";
  appData.responses.forEach(r => {
    csv += `"${r.id}","${r.timestamp}","${r.unit}","${r.surveyTitle}","${r.gender}","${r.age}"\n`;
  });

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `Du_Lieu_Khao_Sat_Doan_TNCS_${Date.now()}.csv`;
  link.click();
  showToast('Đã xuất file CSV thành công!');
};

window.resetAllData = function() {
  if (confirm('Bạn có chắc chắn muốn xóa toàn bộ biểu mẫu và kết quả để bắt đầu lại từ số 0?')) {
    localStorage.removeItem('TWD_SURVEY_DB');
    appData = { surveys: [], responses: [], activeSurveyId: null };
    showToast('Đã xóa dữ liệu về trạng thái rỗng ban đầu!');
    window.switchTab('portal');
  }
};

function showToast(msg, isError = false) {
  const toast = document.createElement('div');
  toast.className = `fixed bottom-6 right-6 z-50 text-white text-xs font-bold px-5 py-3 rounded-2xl shadow-2xl transition duration-300 flex items-center gap-2 ${isError ? 'bg-doan-red' : 'bg-slate-900'}`;
  toast.innerHTML = `<i class="fa-solid ${isError ? 'fa-triangle-exclamation' : 'fa-circle-check'}"></i> <span>${msg}</span>`;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3500);
}

// Tự động khởi chạy
document.addEventListener('DOMContentLoaded', () => {
  loadStorage();
  // Khởi tạo sẵn 1 mẫu Diễn đàn 2026 nếu hệ thống đang rỗng
  if (appData.surveys.length === 0) {
    const sampleSurvey = {
      id: 'SURV_FORUM_2026',
      title: 'PHIẾU TRƯNG CẦU Ý KIẾN THANH NIÊN NĂM 2026',
      desc: 'Phục vụ Diễn đàn “Tiếng nói tuổi trẻ - Hành động của Đoàn” năm 2026. Lắng nghe tâm tư, nguyện vọng của thanh thiếu niên trên toàn quốc.',
      createdAt: new Date().toLocaleDateString('vi-VN'),
      startTime: null,
      endTime: null,
      questions: [
        {
          id: 'q1',
          title: 'Câu 1. Theo bạn, nội dung giáo dục nào cần được tăng cường nhất đối với thanh niên hiện nay? (chọn tối đa 2 ý)',
          type: 'checkbox',
          maxSelect: 2,
          options: ['1. Lý tưởng cách mạng', '2. Đạo đức, lối sống', '3. Lòng yêu nước, tự hào dân tộc', '4. Giá trị sống, kỹ năng sống', '5. Nội dung khác']
        },
        {
          id: 'q2',
          title: 'Câu 2. Theo bạn, nguyên nhân chủ yếu khiến một bộ phận thanh niên thiếu lý tưởng cách mạng là gì? (chọn tối đa 3 ý)',
          type: 'checkbox',
          maxSelect: 3,
          options: ['1. Áp lực mưu sinh, kinh tế', '2. Thiếu định hướng, giáo dục phù hợp', '3. Tác động của lối sống thực dụng', '4. Tuyên truyền còn khô cứng', '5. Thiếu hình mẫu truyền cảm hứng', '6. Thanh niên ít quan tâm']
        },
        {
          id: 'q8',
          title: 'Câu 8. Trong 12 tháng qua, bạn đã tham gia hoạt động tình nguyện nào chưa?',
          type: 'radio',
          options: ['1. Thường xuyên', '2. Thỉnh thoảng', '3. Rất ít', '4. Chưa từng']
        },
        {
          id: 'q14',
          title: 'Câu 14. Mức độ quan tâm của bạn đến khởi nghiệp đổi mới sáng tạo như thế nào?',
          type: 'radio',
          options: ['1. Rất quan tâm', '2. Quan tâm', '3. Bình thường', '4. Không quan tâm']
        },
        {
          id: 'q25',
          title: 'Câu 25. Giải pháp quan trọng nhất để tạo môi trường thuận lợi cho thanh niên khởi nghiệp đổi mới sáng tạo là gì?',
          type: 'text'
        }
      ]
    };
    appData.surveys.push(sampleSurvey);
    appData.activeSurveyId = sampleSurvey.id;
    saveStorage();
  }
  window.switchTab('portal');
});
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('quote-form');
  if (!form) return;

  const steps = Array.from(form.querySelectorAll('.form-step'));
  const stepButtons = Array.from(document.querySelectorAll('[data-go-step]'));
  const progressBar = document.getElementById('progress-bar');
  const progressLabel = document.getElementById('progress-label');
  const progressPercent = document.getElementById('progress-percent');
  const mobileStepLabel = document.getElementById('mobile-step-label');
  const errorBox = document.getElementById('form-error');
  const backButton = document.getElementById('back-button');
  const continueButton = document.getElementById('continue-button');
  const formActions = document.getElementById('form-actions');
  const privacyCopy = document.getElementById('privacy-copy');
  const summaryGrid = document.getElementById('summary-grid');
  const successPanel = document.getElementById('success-panel');
  const navToggle = document.querySelector('.nav-toggle');
  const navMenu = document.querySelector('.nav-menu');
  const selectedPlan = new URLSearchParams(window.location.search).get('plano');
  if (selectedPlan) form.elements.namedItem('plano_comercial').value = selectedPlan.slice(0, 120);
  let currentStep = 0;
  let maxReached = 0;
  let requestData = null;
  let requestId = '';
  let pdfBlob = null;
  let pdfBlobUrl = '';
  let sending = false;

  if (navToggle && navMenu) {
    navToggle.addEventListener('click', () => {
      const isOpen = navMenu.classList.toggle('is-open');
      navToggle.setAttribute('aria-expanded', String(isOpen));
    });
    navMenu.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => {
      navMenu.classList.remove('is-open');
      navToggle.setAttribute('aria-expanded', 'false');
    }));
  }

  const fields = [
    ['Dados do cliente', [['Nome', 'nome'], ['Empresa', 'empresa'], ['Telefone / WhatsApp', 'telefone'], ['E-mail', 'email'], ['Província', 'provincia'], ['Município', 'municipio'], ['Contacto preferido', 'contacto_preferido']]],
    ['Projeto', [['Tipos de site', ['tipo_site', 'tipo_site_outro']], ['Objetivo', 'objetivo'], ['Público-alvo', 'publico_alvo'], ['Já possui site', 'tem_site'], ['Site atual', 'site_atual'], ['Domínio', 'dominio'], ['Hospedagem', 'hospedagem']]],
    ['Design', [['Estilo', 'estilo'], ['Cores', 'cores'], ['Cores a evitar', 'cores_evitar'], ['Tema', 'fundo'], ['Sites de referência', 'referencias'], ['Descrição visual', 'descricao_visual']]],
    ['Funcionalidades', [['Funcionalidades', ['funcionalidades', 'funcionalidade_outro']]]],
    ['Conteúdo', [['Conteúdo disponível', 'conteudo'], ['Logotipo', 'logotipo'], ['Imagens', 'fotos'], ['Ajuda com conteúdo', 'ajuda_conteudo'], ['Páginas desejadas', ['paginas', 'pagina_outra']]]],
    ['Prazo e orçamento', [['Prazo', 'prazo'], ['Faixa de orçamento', 'orcamento'], ['Informações adicionais', 'observacoes']]]
  ];
  if (selectedPlan) fields.unshift(['Plano solicitado', [['Plano', 'plano_comercial']]]);

  const readValue = (name) => {
    const controls = Array.from(form.querySelectorAll(`[name="${CSS.escape(name)}"]`));
    if (!controls.length) return '';
    if (controls[0].type === 'radio') return controls.find((control) => control.checked)?.value || '';
    if (controls[0].type === 'checkbox') return controls.filter((control) => control.checked).map((control) => control.value);
    return controls[0].value.trim();
  };

  function syncConditionalFields() {
    form.querySelectorAll('[data-show-when]').forEach((container) => {
      const [name, expected] = container.dataset.showWhen.split(':');
      const value = readValue(name);
      const visible = Array.isArray(value) ? value.includes(expected) : value === expected;
      container.hidden = !visible;
      container.querySelectorAll('input,textarea,select').forEach((control) => {
        control.required = visible && container.querySelector('i') !== null;
        if (!visible) control.classList.remove('is-invalid', 'is-valid');
      });
    });
  }

  function updateStep(index) {
    currentStep = index;
    steps.forEach((step, stepIndex) => {
      step.hidden = stepIndex !== currentStep;
      step.classList.toggle('is-active', stepIndex === currentStep);
    });
    const percent = Math.round(((index + 1) / steps.length) * 100);
    progressBar.style.width = `${percent}%`;
    progressLabel.textContent = `Etapa ${index + 1} de ${steps.length}`;
    progressPercent.textContent = `${percent}%`;
    mobileStepLabel.textContent = stepButtons[index].textContent.replace(/^\d+/, '').trim();
    stepButtons.forEach((button, buttonIndex) => {
      if (buttonIndex === index) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
      button.classList.toggle('is-complete', buttonIndex < index);
    });
    backButton.disabled = index === 0;
    continueButton.hidden = index === steps.length - 1 && !successPanel.hidden;
    continueButton.innerHTML = index === steps.length - 1 ? 'Confirmar pedido <span aria-hidden="true">→</span>' : 'Continuar <span aria-hidden="true">→</span>';
    errorBox.hidden = true;
    syncConditionalFields();
    document.querySelector('.quote-card').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function showError(message, control) {
    errorBox.textContent = message;
    errorBox.hidden = false;
    if (control) {
      control.classList.add('is-invalid');
      control.focus({ preventScroll: true });
      control.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  function validateStep() {
    const active = steps[currentStep];
    for (const control of active.querySelectorAll('[required]')) {
      if (control.closest('[hidden]')) continue;
      control.classList.remove('is-invalid');
      if (!control.checkValidity()) {
        showError(control.validity.typeMismatch ? 'Introduza um endereço de e-mail ou URL válido.' : 'Preencha este campo para continuar.', control);
        return false;
      }
    }
    if (currentStep === 0) {
      const email = active.querySelector('[name="email"]');
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim())) return showError('Introduza um endereço de e-mail válido.', email), false;
      const phone = active.querySelector('[name="telefone"]');
      if (phone.value.replace(/\D/g, '').length < 8) return showError('Introduza um número de telefone válido, com pelo menos 8 dígitos.', phone), false;
    }
    if (currentStep === 1 && !readValue('tipo_site[]').length) {
      return showError('Selecione pelo menos um tipo de site.', active.querySelector('[name="tipo_site[]"]')), false;
    }
    for (const name of ['tipo_site_outro', 'funcionalidade_outro']) {
      const field = active.querySelector(`[name="${name}"]`);
      if (field && !field.closest('[hidden]') && !field.value.trim()) return showError('Preencha o campo de especificação.', field), false;
    }
    for (const input of active.querySelectorAll('input[type="url"]')) {
      if (input.value.trim() && !input.checkValidity()) return showError('Utilize um endereço válido começando por https:// ou http://.', input), false;
    }
    for (const input of active.querySelectorAll('input[pattern]')) {
      if (!input.checkValidity()) return showError('Introduza a cor em formato HEX, por exemplo #2A0052.', input), false;
    }
    return true;
  }

  function validateAllSteps() {
    const lastStep = currentStep;
    for (let index = 0; index < steps.length - 1; index += 1) {
      currentStep = index;
      if (!validateStep()) {
        maxReached = Math.max(maxReached, index);
        updateStep(index);
        return false;
      }
    }
    currentStep = lastStep;
    return true;
  }

  function collectFormData() {
    const data = {};
    for (const [name, value] of new FormData(form).entries()) {
      const key = name.replace(/\[\]$/, '');
      if (Object.hasOwn(data, key)) {
        if (!Array.isArray(data[key])) data[key] = [data[key]];
        data[key].push(value);
      } else {
        data[key] = name.endsWith('[]') ? [value] : value;
      }
    }
    data.cores = Array.from(form.querySelectorAll('input[type="color"][name="cores[]"]')).map((input) => input.value.toUpperCase());
    return data;
  }

  const displayValue = (value) => {
    if (Array.isArray(value)) return value.length ? value.join(', ') : 'Não informado';
    return value && String(value).trim() ? String(value).trim() : 'Não informado';
  };

  function getCombinedValue(data, keys) {
    if (!Array.isArray(keys)) return displayValue(data[keys]);
    return keys.map((key) => data[key]).filter((value) => Array.isArray(value) ? value.length : value && String(value).trim()).map(displayValue).join(' — ') || 'Não informado';
  }

  function renderSummary(data) {
    summaryGrid.replaceChildren();
    fields.forEach(([heading, items]) => {
      const title = document.createElement('h3');
      title.className = 'summary-section-title summary-item-wide';
      title.textContent = heading;
      summaryGrid.appendChild(title);
      items.forEach(([label, key]) => {
        const item = document.createElement('dl');
        item.className = 'summary-item';
        if (['objetivo', 'descricao_visual', 'observacoes'].includes(key)) item.classList.add('summary-item-wide');
        const term = document.createElement('dt');
        term.textContent = label;
        const value = document.createElement('dd');
        value.textContent = getCombinedValue(data, key);
        item.append(term, value);
        summaryGrid.appendChild(item);
      });
    });
  }

  function generateRequestId() {
    const date = new Date();
    const datePart = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
    const randomPart = String(Math.floor(Math.random() * 9000) + 1000);
    return `SP-${datePart}-${randomPart}`;
  }

  async function loadLogoDataUrl() {
    const response = await fetch('images/logo/logo.jpeg');
    if (!response.ok) throw new Error('Não foi possível carregar o logotipo para o PDF.');
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('Não foi possível preparar o logotipo para o PDF.'));
      reader.readAsDataURL(blob);
    });
  }

  async function generatePDF(data, id) {
    const jsPDF = window.jspdf?.jsPDF;
    if (!jsPDF) throw new Error('A biblioteca de PDF não carregou. Verifique a ligação à Internet e tente novamente.');
    const logoDataUrl = await loadLogoDataUrl();
    const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 18;
    let y = 20;
    const addPageIfNeeded = (height = 8) => {
      if (y + height > pageHeight - margin) { pdf.addPage(); y = margin; }
    };
    pdf.setFillColor(16, 42, 67);
    pdf.rect(0, 0, pageWidth, 40, 'F');
    pdf.addImage(logoDataUrl, 'JPEG', margin, 5, 17, 17);
    pdf.setTextColor(255, 255, 255);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(18);
    pdf.text('SPIDER SKY', margin + 22, 16);
    pdf.setFontSize(10);
    pdf.text('SOLICITAÇÃO DE ORÇAMENTO', margin + 22, 23);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`ID: ${id}   |   ${new Date().toLocaleString('pt-AO')}`, margin + 22, 31);
    y = 50;
    pdf.setTextColor(25, 42, 61);

    const addSection = (heading, rows) => {
      addPageIfNeeded(18);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(12);
      pdf.setTextColor(23, 105, 200);
      pdf.text(heading, margin, y);
      y += 3;
      pdf.setDrawColor(218, 228, 238);
      pdf.line(margin, y, pageWidth - margin, y);
      y += 6;
      rows.forEach(([label, value]) => {
        const fullText = `${label}: ${displayValue(value)}`;
        const lines = pdf.splitTextToSize(fullText, pageWidth - margin * 2);
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(9);
        pdf.setTextColor(43, 58, 75);
        lines.forEach((line) => {
          addPageIfNeeded(6);
          pdf.text(line, margin, y);
          y += 4.8;
        });
        y += 2;
      });
      y += 4;
    };

    fields.forEach(([heading, items]) => addSection(heading.toLocaleUpperCase('pt-PT'), items.map(([label, key]) => [label, Array.isArray(key) ? getCombinedValue(data, key) : data[key]])));
    addPageIfNeeded(17);
    pdf.setDrawColor(218, 228, 238);
    pdf.line(margin, y, pageWidth - margin, y);
    y += 7;
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(10);
    pdf.setTextColor(16, 42, 67);
    pdf.text('Spider Sky', margin, y);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.text('Solicitação gerada através do site oficial.', margin, y + 5);
    pdfBlob = pdf.output('blob');
    pdfBlobUrl = URL.createObjectURL(pdfBlob);
    return pdfBlobUrl;
  }

  function downloadPDF() {
    if (!pdfBlobUrl) return;
    const link = document.createElement('a');
    link.href = pdfBlobUrl;
    link.download = `Orcamento-Spider-Sky-${requestId}.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  function viewPDF() {
    if (!pdfBlobUrl) return;
    const preview = window.open(pdfBlobUrl, '_blank');
    if (!preview) {
      const feedback = document.getElementById('share-feedback');
      feedback.textContent = 'O navegador bloqueou a nova aba. Utilize “Baixar PDF” para abrir o documento.';
      feedback.hidden = false;
      return;
    }
    preview.opener = null;
  }

  function getShareFile() {
    if (!pdfBlob || typeof File === 'undefined') return null;
    return new File([pdfBlob], `Orcamento-Spider-Sky-${requestId}.pdf`, { type: 'application/pdf' });
  }

  function canSharePDF() {
    const file = getShareFile();
    if (!file || typeof navigator.share !== 'function' || typeof navigator.canShare !== 'function') return false;
    try {
      return navigator.canShare({ files: [file] });
    } catch {
      return false;
    }
  }

  async function sharePDF() {
    const file = getShareFile();
    if (!file || !canSharePDF()) {
      showShareFallback();
      return;
    }

    try {
      await navigator.share({
        title: 'Orçamento Spider Sky',
        text: `Olá, Spider Sky!\n\nAcabei de preencher o formulário de orçamento no vosso site.\n\nEstou a enviar o PDF com os detalhes do projeto para que possam analisar a minha ideia e compreender como desejo que seja o meu site.\n\nID da solicitação: ${requestId}\n\nObrigado.`,
        files: [file]
      });
      const status = document.getElementById('share-feedback');
      status.textContent = 'O menu de partilha foi concluído. A solicitação só será enviada depois de confirmar o envio na aplicação escolhida.';
      status.hidden = false;
    } catch (error) {
      if (error.name === 'AbortError') return;
      showShareFallback('Não foi possível iniciar a partilha neste momento. O PDF continua disponível para baixar e enviar manualmente.');
    }
  }

  function showShareFallback(message) {
    const fallback = document.getElementById('share-fallback');
    fallback.hidden = false;
    document.getElementById('share-quote').hidden = true;
    const feedback = document.getElementById('share-feedback');
    if (message) {
      feedback.textContent = message;
      feedback.hidden = false;
    }
  }

  function createMessageSummary() {
    return [
      'Olá, Spider Sky!',
      '',
      'Acabei de preencher o formulário de orçamento no vosso site.',
      '',
      'Estou a enviar o PDF com os detalhes do projeto para que possam analisar a minha ideia e compreender como desejo que seja o meu site.',
      '',
      `ID da solicitação: ${requestId}`,
      '',
      'Obrigado.'
    ].join('\n');
  }

  function openWhatsApp() {
    const fallbackMessage = `${createMessageSummary()}\n\nO meu navegador não partilha arquivos diretamente. Vou anexar o PDF baixado manualmente.`;
    const url = `https://wa.me/244958778696?text=${encodeURIComponent(fallbackMessage)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  function openEmail() {
    const body = [
      createMessageSummary(), '', 'O PDF foi gerado no meu navegador. Vou anexá-lo a este e-mail manualmente.'
    ].join('\n');
    const subject = `Solicitação de Orçamento — Spider Sky — ${requestId}`;
    window.location.href = `mailto:leandromoba@yahoo.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }

  function showSuccess() {
    document.getElementById('success-code').textContent = requestId;
    const supportsFileShare = canSharePDF();
    document.getElementById('share-fallback').hidden = supportsFileShare;
    document.getElementById('share-quote').hidden = !supportsFileShare;
    successPanel.hidden = false;
    summaryGrid.hidden = true;
    formActions.hidden = true;
    privacyCopy.hidden = true;
    continueButton.hidden = true;
    document.querySelector('.quote-card').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  async function nextStep() {
    if (currentStep < steps.length - 1) {
      if (!validateStep()) return;
      maxReached = Math.max(maxReached, currentStep + 1);
      if (currentStep === steps.length - 2) renderSummary(collectFormData());
      updateStep(currentStep + 1);
      return;
    }
    if (sending) return;
    if (!validateAllSteps()) return;
    sending = true;
    continueButton.disabled = true;
    continueButton.classList.add('is-loading');
    try {
      requestData = collectFormData();
      requestId = generateRequestId();
      await generatePDF(requestData, requestId);
      showSuccess();
    } catch (error) {
      const feedback = document.getElementById('share-feedback');
      feedback.textContent = error.message || 'Não foi possível gerar o PDF. Tente novamente.';
      feedback.classList.add('is-error');
      feedback.hidden = false;
    } finally {
      sending = false;
      continueButton.disabled = false;
      continueButton.classList.remove('is-loading');
    }
  }

  function previousStep() {
    if (currentStep > 0 && successPanel.hidden) updateStep(currentStep - 1);
  }

  continueButton.addEventListener('click', nextStep);
  form.addEventListener('submit', (event) => event.preventDefault());
  backButton.addEventListener('click', previousStep);
  document.getElementById('edit-answers').addEventListener('click', () => updateStep(0));
  stepButtons.forEach((button) => button.addEventListener('click', () => {
    const target = Number(button.dataset.goStep);
    if (target <= maxReached && successPanel.hidden) updateStep(target);
  }));
  document.getElementById('download-pdf').addEventListener('click', downloadPDF);
  document.getElementById('view-pdf').addEventListener('click', viewPDF);
  document.getElementById('fallback-download').addEventListener('click', downloadPDF);
  document.getElementById('share-quote').addEventListener('click', sharePDF);
  document.getElementById('open-whatsapp').addEventListener('click', openWhatsApp);
  document.getElementById('open-email').addEventListener('click', openEmail);

  form.addEventListener('input', (event) => {
    const control = event.target;
    if (control.matches('input:not([type=radio]):not([type=checkbox]),textarea,select')) {
      control.classList.remove('is-invalid');
      control.classList.toggle('is-valid', control.value.trim() !== '' && control.checkValidity());
      if (!errorBox.hidden) errorBox.hidden = true;
    }
  });
  form.addEventListener('change', (event) => {
    if (event.target.matches('input[type=radio],input[type=checkbox]')) syncConditionalFields();
  });

  const colorInputs = Array.from(document.querySelectorAll('.color-input'));
  let selectedColor = colorInputs[0];
  colorInputs.forEach((wrapper) => {
    const picker = wrapper.querySelector('input[type=color]');
    const hex = wrapper.querySelector('input[type=text]');
    wrapper.addEventListener('click', () => { selectedColor = wrapper; });
    picker.addEventListener('input', () => { hex.value = picker.value.toUpperCase(); });
    hex.addEventListener('input', () => {
      if (/^#[0-9A-Fa-f]{6}$/.test(hex.value)) picker.value = hex.value;
    });
  });
  document.querySelectorAll('[data-color]').forEach((button) => button.addEventListener('click', () => {
    if (!selectedColor) return;
    selectedColor.querySelector('input[type=color]').value = button.dataset.color;
    selectedColor.querySelector('input[type=text]').value = button.dataset.color.toUpperCase();
  }));

  updateStep(0);
});

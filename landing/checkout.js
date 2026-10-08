(() => {
  const form = document.getElementById("order-form");
  const submit = document.getElementById("order-submit");
  const error = document.getElementById("order-error");
  const reload = document.getElementById("order-reload");
  const province = form.elements.provinceCode;
  const ward = form.elements.wardCode;
  const locationError = document.getElementById("location-error");
  const locationReload = document.getElementById("location-reload");
  let products = [], requestId = "", busy = false, ready = false, wardController;
  const money = value => new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(value);
  const refreshButton = () => { submit.disabled = busy || !ready || province.disabled || ward.disabled || !ward.value; };
  const timeout = () => AbortSignal.timeout(12000);
  async function json(url, signal = timeout()) {
    const response = await fetch(KN.appUrl + url, { signal });
    if (!response.ok) throw new Error("Không tải được thông tin.");
    return response.json();
  }
  const both = document.getElementById("buy-both");
  function selectedItems() {
    return products.map(product => ({ ...product, quantity: both.checked
      ? Number(form.elements["quantity_" + product.sku]?.value || 0)
      : product.sku === form.elements.sku?.value ? Number(form.elements.quantity.value) : 0 }));
  }
  function syncMode() {
    document.getElementById("single-quantity").hidden = both.checked;
    form.elements.quantity.disabled = both.checked;
    document.getElementById("mixed-quantities").hidden = !both.checked;
    both.setAttribute("aria-expanded", String(both.checked));
    products.forEach(p => { const field = form.elements["quantity_" + p.sku]; if (field) field.disabled = !both.checked; });
    form.querySelectorAll('[name="sku"]').forEach(radio => { radio.disabled = both.checked; });
    document.getElementById("checkout-plans").classList.toggle("opacity-60", both.checked);
    document.getElementById("items-error").hidden = true;
    updateTotal();
  }
  both.addEventListener("change", syncMode);
  function updateTotal() {
    const items = selectedItems();
    const total = document.getElementById("order-total");
    const valid = items.every(p => Number.isInteger(p.quantity) && p.quantity >= 0 && p.quantity <= 20) && items.reduce((sum, p) => sum + p.quantity, 0) <= 20;
    const text = !products.length ? "Đang tải giá bán…" : !valid ? "Vui lòng kiểm tra số lượng" : money(items.reduce((sum, p) => sum + p.unitAmount * p.quantity, 0));
    if (total.textContent !== text) {
      total.textContent = text;
      total.classList.remove("price-update");
      void total.offsetWidth;
      total.classList.add("price-update");
    }
    const selection = document.getElementById("order-selection");
    const selected = items.filter(p => p.quantity > 0);
    const summaryKey = JSON.stringify(items.map(p => [p.sku, p.name, p.quantity, p.unitAmount]));
    if (selection.dataset.summary !== summaryKey) {
      selection.dataset.summary = summaryKey;
      selection.replaceChildren();
      if (!valid || !selected.length) {
        const hint = document.createElement("p"); hint.className = "text-[13px] leading-6 text-sage";
        hint.textContent = !valid ? "Vui lòng chọn số lượng hợp lệ, tối đa 20 thẻ mỗi đơn." : "Chọn số lượng ở từng phiên bản để xem đơn của bạn.";
        selection.append(hint);
      } else selected.forEach(product => {
        const row = document.createElement("div"); row.className = "flex items-start justify-between gap-3 rounded-xl border border-sage/20 bg-sage/5 px-4 py-3";
        const detail = document.createElement("div"); detail.className = "min-w-0";
        const name = document.createElement("p"); name.className = "text-[14px] font-medium leading-6 text-paper"; name.textContent = product.name;
        const quantity = document.createElement("p"); quantity.className = "mt-1 text-[12px] leading-5 text-sage"; quantity.textContent = product.quantity + " × " + money(product.unitAmount);
        const amount = document.createElement("p"); amount.className = "shrink-0 whitespace-nowrap text-[14px] font-medium leading-6 text-gold"; amount.textContent = money(product.quantity * product.unitAmount);
        detail.append(name, quantity); row.append(detail, amount); selection.append(row);
      });
    }
  }
  function renderPlans() {
    const selected = form.elements.sku?.value || products[0].sku;
    const quantities = Object.fromEntries(products.map(p => [p.sku, form.elements["quantity_" + p.sku]?.value ?? "1"]));
    document.getElementById("checkout-plans").replaceChildren(...products.map(product => {
      const label = document.createElement("label");
      label.className = "checkout-plan";
      const radio = document.createElement("input"); radio.type = "radio"; radio.name = "sku"; radio.value = product.sku; radio.checked = selected === product.sku;
      const box = document.createElement("span"); box.className = "checkout-plan-box";
      const dot = document.createElement("span"); dot.className = "checkout-plan-dot"; dot.setAttribute("aria-hidden", "true");
      const name = document.createElement("span"); name.className = "block font-serif text-[17px]"; name.textContent = product.name;
      const price = document.createElement("span"); price.className = "mt-2 block text-[20px] font-serif text-gold"; price.textContent = money(product.unitAmount);
      const note = document.createElement("span"); note.className = "mt-2 block text-[11px] leading-5 text-sage"; note.textContent = product.sku === "gift" ? "Thẻ, phong bì, hộp cứng và bìa 99 ngày" : "Thẻ NFC và phong bì";
      box.append(dot, name, price, note); label.append(radio, box); return label;
    }));
    document.getElementById("mixed-quantities").replaceChildren(...products.map(product => {
      const label = document.createElement("label"); label.className = "text-[13px]";
      const caption = document.createElement("span"); caption.textContent = "Số lượng " + product.name.toLowerCase();
      const quantity = document.createElement("input"); quantity.type = "number"; quantity.name = "quantity_" + product.sku;
      quantity.min = "1"; quantity.max = "20"; quantity.step = "1"; quantity.required = true; quantity.value = quantities[product.sku]; quantity.className = "order-field text-center";
      label.append(caption, quantity); return label;
    }));
    syncMode();
  }
  async function loadProducts() {
    ready = false; refreshButton();
    try {
      const data = await json("/api/orders");
      if (!Array.isArray(data.products) || !data.products.length) throw new Error();
      products = data.products; renderPlans(); ready = true; reload.hidden = true; error.textContent = "";
    } catch { error.textContent = "Chưa tải được giá bán. Bạn thử tải lại hoặc nhắn Facebook Khoảng Ngẫm nhé."; reload.hidden = false; }
    refreshButton();
  }
  function resetWard(message) {
    ward.replaceChildren(new Option(message, "")); ward.disabled = true; refreshButton();
  }
  function showLocationError() {
    locationError.textContent = "Chưa tải được địa chỉ. Bạn vui lòng thử lại.";
    locationError.hidden = false; locationReload.hidden = false;
  }
  async function loadProvinces() {
    province.disabled = true; resetWard("Chọn tỉnh/thành trước");
    locationError.hidden = true; locationReload.hidden = true;
    try {
      const data = await json("/api/locations");
      province.replaceChildren(new Option("Chọn tỉnh / thành phố", ""), ...data.provinces.map(p => new Option(p.name, p.code)));
      province.disabled = false;
    } catch { showLocationError(); }
    refreshButton();
  }
  async function loadWards() {
    wardController?.abort();
    resetWard(province.value ? "Đang tải phường/xã…" : "Chọn tỉnh/thành trước");
    locationError.hidden = true; locationReload.hidden = true;
    if (!province.value) return;
    const code = province.value;
    const controller = new AbortController(); wardController = controller;
    const timer = setTimeout(() => controller.abort(), 12000);
    try {
      const data = await json("/api/locations?province=" + encodeURIComponent(code), controller.signal);
      if (province.value !== code || wardController !== controller) return;
      ward.replaceChildren(new Option("Chọn phường / xã", ""), ...data.wards.map(w => new Option(w.name, w.code)));
      ward.disabled = false;
    } catch { if (wardController === controller) showLocationError(); }
    finally { clearTimeout(timer); refreshButton(); }
  }
  province.addEventListener("change", loadWards);
  ward.addEventListener("change", refreshButton);
  locationReload.addEventListener("click", () => province.disabled || !province.value ? loadProvinces() : loadWards());
  reload.addEventListener("click", loadProducts);
  form.addEventListener("input", updateTotal);
  function validateField(field, show = false) {
    if (!field.matches(".order-field") || field.disabled) return true;
    const value = field.value.trim();
    let message = "";
    if (field.required && !value) message = "Vui lòng điền thông tin này.";
    else if (field.name === "phone" && !/^(?:0|\+?84)[35789]\d{8}$/.test(value.replace(/[\s.-]/g, ""))) message = "Nhập số di động Việt Nam hợp lệ, ví dụ 0901234567.";
    else if (field.name === "address" && value.length < 5) message = "Vui lòng nhập số nhà và tên đường/thôn (ít nhất 5 ký tự).";
    else if (field.name.startsWith("quantity") && (field.validity.badInput || !Number.isInteger(Number(value)) || Number(value) < 1 || Number(value) > 20)) message = "Nhập số nguyên từ 1 đến 20.";
    else if (field.maxLength > 0 && value.length > field.maxLength) message = "Thông tin vượt quá " + field.maxLength + " ký tự.";
    field.setCustomValidity(message);
    if (show) {
      let hint = document.getElementById("error-" + field.name);
      if (!hint) {
        hint = document.createElement("span"); hint.id = "error-" + field.name; hint.className = "mt-1 block text-[12px] !text-[#f0a898]"; hint.setAttribute("aria-live", "polite"); field.after(hint);
        field.setAttribute("aria-describedby", [field.getAttribute("aria-describedby"), hint.id].filter(Boolean).join(" "));
      }
      hint.textContent = message; hint.hidden = !message;
      field.setAttribute("aria-invalid", String(Boolean(message)));
    }
    return !message;
  }
  function validateItems() {
    const fields = both.checked ? products.map(p => form.elements["quantity_" + p.sku]) : [form.elements.quantity];
    const count = fields.reduce((sum, f) => sum + Number(f?.value || 0), 0);
    const message = !fields.every(f => f && validateField(f)) ? "Vui lòng kiểm tra số lượng từng loại thẻ." : count < 1 ? "Vui lòng chọn ít nhất 1 thẻ." : count > 20 ? "Mỗi đơn tối đa 20 thẻ." : "";
    const hint = document.getElementById("items-error"); hint.textContent = message; hint.hidden = !message;
    return !message;
  }
  form.noValidate = true;
  form.addEventListener("focusin", event => {
    const field = event.target;
    if (field.matches(".order-field")) {
      const hint = document.getElementById("error-" + field.name);
      if (hint) { hint.hidden = true; hint.textContent = ""; }
      field.removeAttribute("aria-invalid");
      if (field.name.startsWith("quantity_")) document.getElementById("items-error").hidden = true;
    }
  });
  form.addEventListener("focusout", event => {
    const field = event.target;
    if (field.matches(".order-field")) { validateField(field, true); if (field.name.startsWith("quantity")) validateItems(); }
  });
  form.addEventListener("input", event => {
    const field = event.target;
    if (field.matches(".order-field")) {
      validateField(field, false);
      const hint = document.getElementById("error-" + field.name);
      if (hint) { hint.hidden = true; hint.textContent = ""; }
      field.removeAttribute("aria-invalid");
      if (field.name.startsWith("quantity_")) document.getElementById("items-error").hidden = true;
    }
  });
  form.addEventListener("change", event => { if (event.target.matches(".order-field")) validateField(event.target, document.activeElement !== event.target); });
  form.addEventListener("submit", async event => {
    event.preventDefault();
    if (busy || !ready) return;
    const fields = [...form.querySelectorAll(".order-field")];
    const fieldsValid = fields.map(field => validateField(field, true)).every(Boolean);
    const itemsValid = validateItems();
    if (!fieldsValid || !itemsValid || !form.reportValidity()) {
      const invalid = fields.find(f => !f.disabled && !f.validity.valid);
      invalid?.focus();
      // Sau focus, hiện lỗi của lần gửi để người dùng biết vì sao chưa gửi được.
      if (invalid) validateField(invalid, true);
      if (!itemsValid) validateItems();
      return;
    }
    busy = true; refreshButton(); submit.classList.add("is-loading"); submit.textContent = "Đang gửi đơn…"; error.textContent = "";
    try {
      requestId ||= crypto.randomUUID();
      const body = Object.fromEntries(new FormData(form));
      body.items = selectedItems().filter(p => p.quantity > 0).map(p => ({ sku: p.sku, quantity: p.quantity }));
      delete body.sku; delete body.quantity;
      products.forEach(p => delete body["quantity_" + p.sku]);
      body.provinceCode = Number(body.provinceCode); body.wardCode = Number(body.wardCode); body.requestId = requestId;
      const response = await fetch(KN.appUrl + "/api/orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal: AbortSignal.timeout(20000) });
      const data = await response.json();
      if (!response.ok) {
        if (response.status < 500 && response.status !== 429) requestId = "";
        const wait = response.status === 429 ? Number(response.headers.get("Retry-After")) : 0;
        throw new Error((data.error || "Chưa thể gửi đơn. Bạn thử lại nhé.") + (wait ? ` Thử lại sau khoảng ${Math.ceil(wait / 60)} phút.` : ""));
      }
      const success = document.getElementById("order-success");
      success.replaceChildren();
      const title = document.createElement("h3"); title.className = "font-serif text-[28px] text-gold"; title.textContent = "Đã nhận lời nhắn đặt thẻ của bạn";
      const message = document.createElement("p"); message.className = "mt-4 text-sage"; message.textContent = "Đã nhận đơn của bạn. Chúng mình sẽ liên hệ để xác nhận trước khi gửi thẻ. Bạn chưa cần thanh toán lúc này.";
      const reference = document.createElement("p"); reference.className = "mt-5 text-[12px] text-sage/70"; reference.textContent = "Mã đơn: " + data.orderNumber;
      success.append(title, message, reference); success.hidden = false; form.hidden = true; success.focus();
      success.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "center" });
    } catch (failure) {
      error.textContent = ["TypeError", "TimeoutError"].includes(failure.name) ? "Chưa nhận được xác nhận. Bạn bấm gửi lại để kiểm tra, hệ thống sẽ tránh tạo trùng đơn." : failure.message;
    } finally { busy = false; submit.classList.remove("is-loading"); submit.textContent = "Gửi đơn đặt hàng"; refreshButton(); }
  });
  loadProducts(); loadProvinces();
})();

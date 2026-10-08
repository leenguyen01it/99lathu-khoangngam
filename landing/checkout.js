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
  function updateTotal() {
    const product = products.find(p => p.sku === form.elements.sku?.value);
    const quantity = Number(form.elements.quantity.value);
    const total = document.getElementById("order-total");
    const text = product ? "Tổng tiền: " + money(product.unitAmount * (Number.isFinite(quantity) ? quantity : 0)) : "Đang tải giá bán…";
    if (total.textContent !== text) {
      total.textContent = text;
      total.classList.remove("price-update");
      void total.offsetWidth;
      total.classList.add("price-update");
    }
    document.getElementById("order-selection").textContent = product ? product.name + " · " + quantity + " thẻ" : "Chọn phiên bản dành cho bạn";
  }
  function renderPlans() {
    const selected = form.elements.sku?.value || products[0].sku;
    document.getElementById("checkout-plans").replaceChildren(...products.map(product => {
      const label = document.createElement("label");
      label.className = "checkout-plan";
      const radio = document.createElement("input");
      radio.type = "radio"; radio.name = "sku"; radio.value = product.sku; radio.required = true; radio.checked = product.sku === selected;
      const box = document.createElement("span"); box.className = "checkout-plan-box";
      const dot = document.createElement("span"); dot.className = "checkout-plan-dot"; dot.setAttribute("aria-hidden", "true");
      const name = document.createElement("span"); name.className = "block font-serif text-[17px]"; name.textContent = product.name;
      const price = document.createElement("span"); price.className = "mt-2 block text-[20px] font-serif text-[#8c6f40]"; price.textContent = money(product.unitAmount);
      const note = document.createElement("span"); note.className = "mt-2 block text-[11px] leading-5 text-[#657568]"; note.textContent = product.sku === "gift" ? "Thẻ, phong bì, hộp cứng và bìa 99 ngày" : "Thẻ NFC và phong bì";
      box.append(dot, name, price, note); label.append(radio, box); return label;
    }));
    updateTotal();
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
  const phone = form.elements.phone;
  function validatePhone() {
    const compact = phone.value.replace(/[\s.-]/g, "");
    phone.setCustomValidity(/^(?:0|\+?84)[35789]\d{8}$/.test(compact) ? "" : "Vui lòng nhập số di động Việt Nam, ví dụ 0901234567 hoặc +84901234567.");
  }
  phone.addEventListener("input", validatePhone);
  phone.addEventListener("blur", validatePhone);
  form.addEventListener("submit", async event => {
    event.preventDefault();
    if (busy || !ready) return;
    validatePhone();
    if (!form.reportValidity()) return;
    busy = true; refreshButton(); submit.classList.add("is-loading"); submit.textContent = "Đang gửi đơn…"; error.textContent = "";
    try {
      requestId ||= crypto.randomUUID();
      const body = Object.fromEntries(new FormData(form));
      body.quantity = Number(body.quantity); body.provinceCode = Number(body.provinceCode); body.wardCode = Number(body.wardCode); body.requestId = requestId;
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

import { ClubSettings } from "@/context/auth-context";

interface PrintReceiptOptions {
  type: 'subscription' | 'sale';
  data: any;
  settings: any;
  language: 'ar' | 'en';
  t: (key: string) => string;
  format?: 'thermal' | 'a4';
}

export const printReceipt = ({ type, data, settings, language, t, format }: PrintReceiptOptions) => {
  const isThermal = format ? (format === 'thermal') : (settings?.receiptType === 'thermal' || !settings?.receiptType);
  const isArabic = language === 'ar';

  const printWindow = window.open('', '', 'height=600,width=800');
  if (!printWindow) return;

  const receiptId = data.id?.slice(0, 8) || 'N/A';
  const date = new Date().toLocaleDateString(isArabic ? 'ar-BH' : 'en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const total = data.total || data.amount || data.totalPrice || 0;
  const isPaid = data.paymentStatus === 'paid';
  const amountPaid = isPaid ? total : 0;
  const balanceDue = Math.max(0, total - amountPaid);

  let content = '';

  if (isThermal) {
    // Thermal 80mm Layout
    content = `
      <html>
        <head>
          <title>${t("subscriptions.receiptTitle")} - ${data.memberName || data.buyerName}</title>
          <script src="https://cdn.tailwindcss.com"></script>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap');
            body { font-family: 'Cairo', sans-serif; margin: 0; padding: 0; }
            @page { size: 80mm auto; margin: 0; }
            .receipt-container { width: 80mm; padding: 10mm 5mm; margin: 0 auto; }
          </style>
        </head>
        <body class="bg-white" dir="${isArabic ? 'rtl' : 'ltr'}">
          <div class="receipt-container">
            <!-- Header -->
            <div class="flex flex-col items-center mb-6 text-center">
              ${settings?.receiptLogoThermal ? `<img src="${settings.receiptLogoThermal}" class="w-20 h-20 object-contain mb-2" />` : (settings?.logoUrlLight ? `<img src="${settings.logoUrlLight}" class="w-16 h-16 object-contain mb-2" />` : '')}
              <h1 class="text-xl font-bold text-gray-900">${settings?.name || t("members.clubFallback")}</h1>
              <p class="text-[10px] text-gray-500 mt-1">${date}</p>
            </div>

            <!-- Receipt Details -->
            <div class="border-t-2 border-dashed border-gray-200 py-4 space-y-3">
               <div class="flex justify-between items-center text-sm">
                <span class="text-gray-500">${t("subscriptions.receiptNumber")}:</span>
                <span class="font-mono font-bold">#${receiptId}</span>
              </div>
              <div class="flex justify-between items-center text-sm">
                <span class="text-gray-500">${t("members.memberId")}:</span>
                <span class="font-mono font-bold">${data.memberDisplayId || 'N/A'}</span>
              </div>
              <div class="flex justify-between items-center text-sm">
                <span class="text-gray-500">${t("subscriptions.member")}:</span>
                <span class="font-semibold text-gray-900">${data.memberName || data.buyerName || t("common.guest")}</span>
              </div>
              
              ${data.items && data.items.length > 0 ? `
                <div class="border-t border-gray-100 pt-3 mt-1">
                  ${data.items.map((item: any) => `
                    <div class="flex justify-between items-start text-sm mb-2">
                      <div class="flex flex-col">
                        <span class="font-semibold text-gray-900">${item.productName}</span>
                        <span class="text-[10px] text-gray-500">${item.quantity} x ${item.unitPrice}</span>
                      </div>
                      <span class="font-mono text-gray-900">${item.totalPrice}</span>
                    </div>
                  `).join('')}
                </div>
              ` : `
                ${type === 'subscription' ? `
                  <div class="flex justify-between items-center text-sm">
                    <span class="text-gray-500">${t("subscriptions.package")}:</span>
                    <span class="font-semibold text-gray-900">${data.planName || 'N/A'}</span>
                  </div>
                  <div class="flex justify-between items-center text-sm">
                    <span class="text-gray-500">${t("common.from")}:</span>
                    <span class="font-mono text-gray-900">${data.startDate || '-'}</span>
                  </div>
                  <div class="flex justify-between items-center text-sm">
                    <span class="text-gray-500">${t("common.to")}:</span>
                    <span class="font-mono text-gray-900">${data.endDate || '-'}</span>
                  </div>
                ` : `
                  <div class="flex justify-between items-center text-sm">
                    <span class="text-gray-500">${t("sales.product")}:</span>
                    <span class="font-semibold text-gray-900">${data.productName || 'N/A'}</span>
                  </div>
                  <div class="flex justify-between items-center text-sm">
                    <span class="text-gray-500">${t("common.amount")}:</span>
                    <span class="font-mono text-gray-900">${data.quantity || 1} x ${data.unitPrice || data.totalPrice || 0}</span>
                  </div>
                `}
              `}
            </div>

            <!-- Totals -->
            <div class="border-t-2 border-dashed border-gray-200 pt-4 mt-2">
              <div class="flex justify-between items-center mb-4">
                <span class="text-base font-bold text-gray-900">${t("subscriptions.totalAmount")}</span>
                <span class="text-xl font-bold text-gray-900">${data.amount || data.totalPrice || total} ${t("common.currency")}</span>
              </div>
               <div class="flex justify-between items-center text-xs text-gray-500 bg-gray-50 p-2 rounded">
                <span>${t("subscriptions.paymentStatus")}:</span>
                <span class="font-medium ${data.paymentStatus === 'paid' ? 'text-green-600' : 'text-red-600'}">
                  ${data.paymentStatus === 'paid' ? t('subscriptions.paid') : (data.paymentStatus === 'unpaid' ? t('subscriptions.unpaid') : t('subscriptions.pending'))}
                </span>
              </div>
            </div>

            <!-- Footer -->
            <div class="mt-8 text-center space-y-1">
               <p class="text-xs text-gray-400">${t("subscriptions.receiptThanks")}</p>
               <p class="text-[10px] text-gray-300">${t("subscriptions.receiptFooterNote")}</p>
            </div>
          </div>
          <script>
            window.onload = () => { setTimeout(() => { window.print(); window.close(); }, 500); };
          </script>
        </body>
      </html>
    `;
  } else {
    // formal A4 Invoice Layout
    content = `
      <html>
        <head>
          <title>Invoice #${receiptId} - ${data.memberName || data.buyerName}</title>
          <script src="https://cdn.tailwindcss.com"></script>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&display=swap');
            tailwind.config = {
              theme: {
                extend: {
                  colors: {
                    primary: '#2563eb',
                  }
                }
              }
            }
            * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            body { 
              font-family: 'Cairo', sans-serif; 
              margin: 0; 
              padding: 0; 
              color: #1a1a1a;
              background-color: white;
            }
            @page { 
              size: A4; 
              margin: 0; 
            }
            .a4-container { 
              width: 210mm; 
              height: 297mm; 
              padding: 0;
              margin: 0 auto; 
              position: relative;
              background-image: ${settings?.receiptA4Design ? `url('${settings.receiptA4Design}')` : 'none'};
              background-size: 100% 100%;
              background-position: center;
              background-repeat: no-repeat;
              overflow: hidden;
              box-sizing: border-box;
            }
            .invoice-wrapper {
              position: absolute;
              top: 0;
              left: 0;
              width: 100%;
              height: 100%;
              display: flex;
              flex-direction: column;
              justify-content: center;
              padding: 0 20mm;
              box-sizing: border-box;
              z-index: 10;
            }
            .invoice-shell {
              margin-top: ${settings?.receiptA4Design ? '20mm' : '0'};
              display: flex;
              flex-direction: column;
            }
            .table-header {
              background-color: rgba(248, 250, 252, 0.3);
              border-bottom: 2px solid #e2e8f0;
            }
            .currency-symbol {
              font-size: 0.8em;
              color: #64748b;
              margin-inline: 4px;
            }
            /* Force single page */
            tr, td, th, div { page-break-inside: avoid !important; }
            .no-bg { background-color: transparent !important; }
          </style>
        </head>
        <body dir="${isArabic ? 'rtl' : 'ltr'}">
          <div class="a4-container">
            <div class="invoice-wrapper">
                <div class="invoice-shell">
                  <!-- Invoice Meta Info -->
                  <div class="flex justify-between items-end mb-8">
                    <div class="max-w-[50%]">
                      ${!settings?.receiptA4Design ? `
                        <h1 class="text-3xl font-black text-gray-900 mb-2 uppercase tracking-tight">${settings?.name || t("members.clubFallback")}</h1>
                        <div class="text-xs text-gray-500 font-medium leading-relaxed">
                          <p>${settings?.location || ''}</p>
                          <p>${settings?.phone || ''}</p>
                        </div>
                      ` : '<div></div>'}
                    </div>
                    <div class="text-end">
                      <h2 class="text-4xl font-extrabold text-gray-400 mb-2 tracking-tighter uppercase leading-none opacity-30">${t("finance.invoice")}</h2>
                      <div class="flex flex-col items-end gap-1">
                        <span class="text-xs font-bold text-gray-400 uppercase tracking-widest">${t("subscriptions.receiptNumber")}</span>
                        <span class="text-lg font-mono font-bold text-gray-900">#${receiptId}</span>
                        <span class="text-[10px] font-bold text-gray-400 uppercase mt-1 px-2 py-0.5 bg-gray-100/50 rounded">${date}</span>
                      </div>
                    </div>
                  </div>

                  <!-- Bill To & Summary Grid (CLEAN/TRANSPARENT) -->
                  <div class="grid grid-cols-5 gap-0 mb-8 border border-gray-100 rounded-xl overflow-hidden no-bg">
                    <div class="col-span-3 p-6 no-bg">
                      <h3 class="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <div class="w-1 h-3 bg-primary rounded-full"></div>
                        ${t("subscriptions.member")} / ${t("finance.billTo")}
                      </h3>
                      <div class="text-2xl font-black text-gray-900 mb-1">${data.memberName || data.buyerName}</div>
                      <div class="flex gap-4 mt-2">
                        <span class="text-xs font-bold text-gray-500 font-mono">ID: ${data.memberDisplayId || data.memberId || 'N/A'}</span>
                        ${data.buyerPhone ? `<span class="text-xs font-bold text-gray-500 font-mono">TEL: ${data.buyerPhone}</span>` : ''}
                      </div>
                    </div>
                    <div class="col-span-2 p-6 flex flex-col justify-center items-center border-l border-gray-100 no-bg">
                      <div class="text-center">
                        <h3 class="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">${t("subscriptions.paymentStatus")}</h3>
                        <div class="px-6 py-2 rounded-lg text-sm font-black uppercase tracking-wider ${isPaid ? 'bg-green-100/30 text-green-700' : 'bg-red-100/30 text-red-700'}">
                            ${isPaid ? t('subscriptions.paid') : t('subscriptions.unpaid')}
                        </div>
                        <p class="text-[10px] font-bold text-gray-400 mt-3 uppercase">${t("finance.paymentMethod")}: <span class="text-gray-900">${data.paymentMethod || 'N/A'}</span></p>
                      </div>
                    </div>
                  </div>

                  <!-- Itemized Table (CLEAN/TRANSPARENT) -->
                  <div class="mb-8">
                    <table class="w-full text-sm">
                      <thead>
                        <tr class="table-header">
                          <th class="p-4 text-start font-black text-gray-500 uppercase tracking-widest text-[10px]">${t("common.description")}</th>
                          <th class="p-4 text-center font-black text-gray-500 uppercase tracking-widest text-[10px]">${t("finance.category")}</th>
                          <th class="p-4 text-center font-black text-gray-500 uppercase tracking-widest text-[10px]">${t("common.amount")}</th>
                          <th class="p-4 text-end font-black text-gray-500 uppercase tracking-widest text-[10px]">${t("finance.totalPrice")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${data.items && data.items.length > 0 ?
        data.items.map((item: any) => `
                            <tr class="border-b border-gray-100">
                              <td class="p-6">
                                <div class="font-bold text-lg text-gray-900 mb-1">${item.productName}</div>
                                <div class="text-[10px] font-bold text-gray-400">
                                   QTY: ${item.quantity} &times; ${item.unitPrice} ${t("common.currency")}
                                </div>
                              </td>
                              <td class="p-6 text-center">
                                <span class="px-3 py-1 bg-gray-100/30 text-gray-600 rounded text-[9px] font-black uppercase tracking-tighter">
                                  ${t("nav.store")}
                                </span>
                              </td>
                              <td class="p-6 text-center font-bold text-gray-500">
                                ${item.unitPrice}
                              </td>
                              <td class="p-6 text-end font-black text-lg text-gray-900">
                                ${item.totalPrice}<span class="currency-symbol">${t("common.currency")}</span>
                              </td>
                            </tr>
                          `).join('') : `
                            <tr class="border-b border-gray-100">
                              <td class="p-6">
                                <div class="font-bold text-lg text-gray-900 mb-1">${data.planName || data.productName || 'N/A'}</div>
                                ${type === 'subscription' ? `
                                  <div class="text-[10px] font-bold text-gray-400 flex items-center gap-2">
                                     ${data.startDate || '-'} &mdash; ${data.endDate || '-'}
                                  </div>
                                ` : `
                                  <div class="text-[10px] font-bold text-gray-400">
                                     QTY: ${data.quantity || 1} &times; ${data.unitPrice || data.totalPrice || 0} ${t("common.currency")}
                                  </div>
                                `}
                              </td>
                              <td class="p-6 text-center">
                                <span class="px-3 py-1 bg-gray-100/30 text-gray-600 rounded text-[9px] font-black uppercase tracking-tighter">
                                  ${type === 'subscription' ? t("nav.subscriptions") : t("nav.store")}
                                </span>
                              </td>
                              <td class="p-6 text-center font-bold text-gray-500">
                                ${data.amount || data.totalPrice || 0}
                              </td>
                              <td class="p-6 text-end font-black text-lg text-gray-900">
                                ${data.amount || data.totalPrice || 0}<span class="currency-symbol">${t("common.currency")}</span>
                              </td>
                            </tr>
                        `}
                      </tbody>
                    </table>
                  </div>

                  <!-- Financial Summary (TRANSPARENT) -->
                  <div class="flex justify-end mb-8 p-10 bg-gray-50/5 rounded-2xl">
                    <div class="w-80 space-y-4">
                      <div class="flex justify-between items-center text-xs">
                        <span class="font-black text-gray-400 uppercase tracking-widest">${t("finance.subtotal")}</span>
                        <span class="font-bold text-gray-600">${total} ${t("common.currency")}</span>
                      </div>
                      <div class="flex justify-between items-center border-t border-gray-100 pt-4 text-xs">
                        <span class="font-black text-gray-400 uppercase tracking-widest leading-none">${t("subscriptions.paid")} / ${t("finance.recv")}</span>
                        <span class="font-black text-green-600">${amountPaid} ${t("common.currency")}</span>
                      </div>
                      
                      ${!isPaid ? `
                        <div class="flex justify-between items-center p-4 border-2 border-red-100/30 rounded-xl">
                          <span class="text-xs font-black text-red-600 uppercase tracking-widest">${t("finance.due")}</span>
                          <span class="text-xl font-black text-red-600">${balanceDue} ${t("common.currency")}</span>
                        </div>
                      ` : ''}
                    </div>
                  </div>

                  <!-- Professional Footer (CLEAN) -->
                  <div class="text-center">
                    <div class="flex items-center gap-4 mb-6">
                      <div class="flex-grow h-px bg-gray-100/50"></div>
                      <p class="text-[10px] font-black text-gray-300 uppercase tracking-[0.4em] px-4">${t("subscriptions.receiptThanks")}</p>
                      <div class="flex-grow h-px bg-gray-100/50"></div>
                    </div>
                    <div class="flex justify-between items-center px-4">
                      <div class="flex gap-6 text-[9px] font-black text-gray-300 uppercase tracking-widest">
                        <span>${settings?.socials?.instagram ? 'INSTAGRAM / ' + settings.socials.instagram : ''}</span>
                        <span>${settings?.socials?.facebook ? 'FACEBOOK / ' + settings.socials.facebook : ''}</span>
                      </div>
                      <div class="text-[9px] font-black text-gray-400 uppercase tracking-widest italic opacity-20">
                        ClubManager &copy; ${new Date().getFullYear()}
                      </div>
                    </div>
                  </div>
                </div>
            </div>
          </div>
          <script>
            window.onload = () => { setTimeout(() => { window.print(); window.close(); }, 500); };
          </script>
        </body>
      </html>
    `;
  }

  printWindow.document.write(content);
  printWindow.document.close();
};

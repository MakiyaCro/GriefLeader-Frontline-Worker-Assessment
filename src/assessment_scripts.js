function hideSpinner() {
    const spinnerModalEl = document.getElementById('loadingModal');
    
    // Remove modal instance
    const spinnerInstance = bootstrap.Modal.getInstance(spinnerModalEl);
    if (spinnerInstance) {
        spinnerInstance.dispose();
    }
    
    // Force remove all modal-related classes and styles
    spinnerModalEl.classList.remove('show', 'fade', 'modal-open');
    spinnerModalEl.style.display = 'none';
    document.body.classList.remove('modal-open');
    
    // Remove backdrops
    const backdrops = document.querySelectorAll('.modal-backdrop');
    backdrops.forEach(backdrop => {
        backdrop.classList.remove('show', 'fade');
        backdrop.remove();
    });
}

function showReportPreview(assessmentId) {
    const spinnerModalEl = document.getElementById('loadingModal');
    const previewModalEl = document.getElementById('pdfPreviewModal');
    const viewer = document.getElementById('pdfViewer');
    const downloadBtn = document.getElementById('downloadButton');
    
    // Force clean initial state
    hideSpinner();
    
    // Initialize new modal instance
    const spinnerModal = new bootstrap.Modal(spinnerModalEl);
    const previewModal = new bootstrap.Modal(previewModalEl);
    
    // Show spinner
    spinnerModal.show();
    
    // Get the URL for the PDF
    const pdfUrl = `/assessment/${assessmentId}/preview-report/`;
    
    // Add safety timeout
    const safetyTimeout = setTimeout(() => {
        hideSpinner();
        alert('The preview is taking too long to load. Please try again.');
    }, 10000);
    
    fetch(pdfUrl)
        .then(response => {
            if (!response.ok) {
                throw new Error('PDF not accessible');
            }
            clearTimeout(safetyTimeout);
            hideSpinner();
            
            viewer.src = pdfUrl;
            
            setTimeout(() => {
                previewModal.show();
            }, 100);
            
            downloadBtn.onclick = function() {
                window.location.href = `/assessment/${assessmentId}/download-report/`;
            };
        })
        .catch(error => {
            clearTimeout(safetyTimeout);
            hideSpinner();
            alert('Error loading the PDF preview. Please try again.');
        });
}

document.getElementById('pdfPreviewModal').addEventListener('hidden.bs.modal', function () {
    document.getElementById('pdfViewer').src = '';
    hideSpinner();
});

function confirmResend(assessmentId, candidateName) {
    const modal = new bootstrap.Modal(document.getElementById('resendConfirmModal'));
    document.getElementById('candidateName').textContent = candidateName;
    
    document.getElementById('confirmResendBtn').onclick = function() {
        modal.hide();
        const loadingModal = new bootstrap.Modal(document.getElementById('loadingModal'));
        loadingModal.show();
        
        window.location.href = `/assessment/${assessmentId}/resend/`;
    };
    
    modal.show();
}

function copyAssessmentLink(uniqueLink) {
    const baseUrl = window.location.origin;
    const fullUrl = `${baseUrl}/assessment/${uniqueLink}/`;
    
    navigator.clipboard.writeText(fullUrl).then(function() {
        const toast = document.createElement('div');
        toast.className = 'position-fixed bottom-0 end-0 p-3';
        toast.style.zIndex = '11';
        toast.innerHTML = `
            <div class="toast align-items-center text-white bg-success border-0" role="alert">
                <div class="d-flex">
                    <div class="toast-body">
                        <i class="bi bi-check-circle me-2"></i>Assessment link copied to clipboard!
                    </div>
                    <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
                </div>
            </div>
        `;
        document.body.appendChild(toast);
        const toastElement = new bootstrap.Toast(toast.querySelector('.toast'));
        toastElement.show();
        
        toast.addEventListener('hidden.bs.toast', function () {
            document.body.removeChild(toast);
        });
    }).catch(function(err) {
        console.error('Failed to copy text: ', err);
        alert('Failed to copy assessment link. Please try again.');
    });
}

document.getElementById('loadingModal').addEventListener('hidden.bs.modal', function() {
    console.log('Spinner hidden event triggered');
    hideSpinner();
});
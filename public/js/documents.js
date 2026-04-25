document.addEventListener('DOMContentLoaded', function() {
    const uploadForm = document.getElementById('uploadForm');
    const uploadProgress = document.getElementById('uploadProgress');

    // Handle file upload (same as dashboard)
    if (uploadForm) {
        uploadForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const formData = new FormData();
            const fileInput = document.getElementById('document');
            const categorySelect = document.getElementById('category');
            
            if (!fileInput.files[0]) {
                showAlert('Please select a file', 'danger');
                return;
            }

            formData.append('document', fileInput.files[0]);
            formData.append('category', categorySelect.value);

            uploadProgress.style.display = 'block';
            const progressBar = uploadProgress.querySelector('.progress-bar');
            progressBar.style.width = '0%';

            try {
                const xhr = new XMLHttpRequest();
                
                xhr.upload.addEventListener('progress', function(e) {
                    if (e.lengthComputable) {
                        const percentComplete = (e.loaded / e.total) * 100;
                        progressBar.style.width = percentComplete + '%';
                    }
                });

                xhr.addEventListener('load', function() {
                    if (xhr.status === 200) {
                        const response = JSON.parse(xhr.responseText);
                        if (response.success) {
                            progressBar.style.width = '100%';
                            setTimeout(() => {
                                uploadProgress.style.display = 'none';
                                showAlert('File uploaded successfully!', 'success');
                                uploadForm.reset();
                                const modal = bootstrap.Modal.getInstance(document.getElementById('uploadModal'));
                                modal.hide();
                                setTimeout(() => {
                                    window.location.reload();
                                }, 1000);
                            }, 500);
                        } else {
                            showAlert(response.message || 'Upload failed', 'danger');
                            uploadProgress.style.display = 'none';
                        }
                    } else {
                        showAlert('Upload failed. Please try again.', 'danger');
                        uploadProgress.style.display = 'none';
                    }
                });

                xhr.addEventListener('error', function() {
                    showAlert('Upload failed. Please try again.', 'danger');
                    uploadProgress.style.display = 'none';
                });

                xhr.open('POST', '/documents/upload');
                xhr.send(formData);
            } catch (error) {
                console.error('Upload error:', error);
                showAlert('Upload failed. Please try again.', 'danger');
                uploadProgress.style.display = 'none';
            }
        });
    }
});

// Delete document
async function deleteDocument(documentId) {
    if (!confirm('Are you sure you want to delete this document?')) {
        return;
    }

    try {
        const response = await fetch(`/documents/${documentId}`, {
            method: 'DELETE'
        });

        const data = await response.json();
        if (data.success) {
            showAlert('Document deleted successfully', 'success');
            setTimeout(() => {
                window.location.reload();
            }, 1000);
        } else {
            showAlert(data.message || 'Failed to delete document', 'danger');
        }
    } catch (error) {
        console.error('Delete error:', error);
        showAlert('Failed to delete document', 'danger');
    }
}


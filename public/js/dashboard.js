document.addEventListener('DOMContentLoaded', function() {
    const uploadForm = document.getElementById('uploadForm');
    const uploadProgress = document.getElementById('uploadProgress');
    const profileForm = document.getElementById('profileForm');

    // Handle file upload
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
                    let response = {};
                    try { response = JSON.parse(xhr.responseText); } catch (_) {}

                    // Treat any 2xx status as success (route returns 201 Created)
                    if (xhr.status >= 200 && xhr.status < 300 && response.success) {
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
                        const msg = response.message || 'Upload failed. Please try again.';
                        showAlert(msg, 'danger');
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

    // Handle profile update
    if (profileForm) {
        profileForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const formData = {
                firstName: document.getElementById('firstName').value,
                lastName: document.getElementById('lastName').value,
                bio: document.getElementById('bio').value
            };

            try {
                const response = await fetch('/dashboard/profile', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(formData)
                });

                const data = await response.json();
                if (data.success) {
                    showAlert('Profile updated successfully!', 'success');
                    const modal = bootstrap.Modal.getInstance(document.getElementById('profileModal'));
                    modal.hide();
                    setTimeout(() => {
                        window.location.reload();
                    }, 1000);
                } else {
                    showAlert(data.message || 'Failed to update profile', 'danger');
                }
            } catch (error) {
                console.error('Profile update error:', error);
                showAlert('Failed to update profile', 'danger');
            }
        });
    }
});


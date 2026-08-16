document.addEventListener('DOMContentLoaded', () => {
    const API_URL = '/api/forms';
    
    // UI Elements
    const formSelectorContainer = document.getElementById('form-selector-container');
    const dynamicFormContainer = document.getElementById('dynamic-form-container');
    const formListEl = document.getElementById('form-list');
    const loadingEl = document.getElementById('forms-loading');
    const btnBack = document.getElementById('btn-back');
    const formTitle = document.getElementById('form-title');
    const formDescription = document.getElementById('form-description');
    const dynamicFields = document.getElementById('dynamic-fields');
    const feedbackForm = document.getElementById('feedback-form');
    const submitBtn = document.getElementById('submit-btn');
    const submissionMessage = document.getElementById('submission-message');

    let currentFormId = null;

    // Load available forms on startup
    fetchForms();

    btnBack.addEventListener('click', () => {
        dynamicFormContainer.style.display = 'none';
        formSelectorContainer.style.display = 'block';
        feedbackForm.reset();
        submissionMessage.style.display = 'none';
    });

    async function fetchForms() {
        try {
            // First time load might be empty, so we seed one if needed
            let res = await fetch(API_URL);
            let forms = await res.json();
            
            // Seed a default form if none exist
            if (forms.length === 0) {
                await fetch(API_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        title: "GDG Noida Feedback Portal",
                        description: "We value your insights. Please securely upload your feedback.",
                        schema: [
                            { name: "rating", type: "rating", required: true },
                            { name: "comments", type: "text", required: false },
                            { name: "attachment", type: "file", required: false }
                        ]
                    })
                });
                res = await fetch(API_URL);
                forms = await res.json();
            }

            loadingEl.style.display = 'none';
            renderFormList(forms);
        } catch (error) {
            loadingEl.textContent = 'Error loading forms. Is the server running?';
        }
    }

    function renderFormList(forms) {
        formListEl.innerHTML = '';
        forms.forEach(form => {
            const el = document.createElement('div');
            el.className = 'form-item';
            el.innerHTML = `
                <h3>${form.title}</h3>
                <p>${form.description || 'Provide your feedback'}</p>
            `;
            el.addEventListener('click', () => loadFormSchema(form.id));
            formListEl.appendChild(el);
        });
    }

    async function loadFormSchema(id) {
        try {
            const res = await fetch(`${API_URL}/${id}`);
            const form = await res.json();
            
            currentFormId = form.id;
            formTitle.textContent = form.title;
            formDescription.textContent = form.description || '';
            
            renderDynamicFields(form.schema);
            
            formSelectorContainer.style.display = 'none';
            dynamicFormContainer.style.display = 'block';
            submissionMessage.style.display = 'none';
        } catch (error) {
            alert('Failed to load form schema');
        }
    }

    function renderDynamicFields(schema) {
        dynamicFields.innerHTML = '';
        
        schema.forEach(field => {
            const group = document.createElement('div');
            group.className = 'form-group';
            
            const label = document.createElement('label');
            label.setAttribute('for', field.name);
            label.innerHTML = `${formatFieldName(field.name)} ${field.required ? '<span class="required-mark">*</span>' : ''}`;
            group.appendChild(label);

            let input;
            
            switch (field.type) {
                case 'rating':
                    input = document.createElement('select');
                    input.innerHTML = `<option value="">Select a rating (1-5)</option>
                                     <option value="5">5 - Excellent</option>
                                     <option value="4">4 - Very Good</option>
                                     <option value="3">3 - Good</option>
                                     <option value="2">2 - Fair</option>
                                     <option value="1">1 - Poor</option>`;
                    break;
                case 'nps':
                    input = document.createElement('input');
                    input.type = 'number';
                    input.min = '0';
                    input.max = '10';
                    input.placeholder = 'Score 0-10';
                    break;
                case 'file':
                    input = document.createElement('input');
                    input.type = 'file';
                    input.accept = 'application/pdf,image/png,image/jpeg';
                    break;
                case 'text':
                default:
                    input = document.createElement('textarea');
                    input.rows = 4;
                    input.placeholder = 'Enter your text here...';
                    break;
            }

            input.id = field.name;
            input.name = field.name;
            if (field.required) input.required = true;
            
            // Tag the input dataset with its type so we can serialize it easily
            input.dataset.type = field.type;

            group.appendChild(input);
            dynamicFields.appendChild(group);
        });
    }

    function formatFieldName(name) {
        return name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }

    feedbackForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        submitBtn.disabled = true;
        submitBtn.textContent = 'Submitting...';
        submissionMessage.style.display = 'none';

        const formData = new FormData(feedbackForm);
        const submitData = new FormData();
        const payloadData = {};

        // Separate files from regular data
        for (const [key, value] of formData.entries()) {
            const inputEl = document.getElementById(key);
            const type = inputEl ? inputEl.dataset.type : 'text';

            if (type === 'file') {
                if (value.size > 0) { // Only append if file actually selected
                    submitData.append(key, value);
                }
            } else {
                // Coerce types based on dynamic schema
                if ((type === 'rating' || type === 'nps') && value) {
                    payloadData[key] = Number(value);
                } else if (value) {
                    payloadData[key] = value;
                }
            }
        }

        submitData.append('data', JSON.stringify(payloadData));

        try {
            const res = await fetch(`${API_URL}/${currentFormId}/submissions`, {
                method: 'POST',
                body: submitData
            });

            const result = await res.json();

            if (res.ok) {
                submissionMessage.textContent = 'Feedback successfully securely submitted!';
                submissionMessage.className = 'message success';
                feedbackForm.reset();
            } else {
                submissionMessage.textContent = result.error || 'Validation failed. Please check inputs.';
                submissionMessage.className = 'message error';
            }
        } catch (error) {
            submissionMessage.textContent = 'Network error occurred.';
            submissionMessage.className = 'message error';
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Submit Feedback';
        }
    });
});

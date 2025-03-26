from django import forms
from django.core.exceptions import ValidationError
from django.contrib.auth.password_validation import validate_password
from .models import Assessment, AssessmentResponse, QuestionResponse, Business, BenchmarkBatch, Attribute, QuestionPair, CustomUser, Manager

class BusinessForm(forms.ModelForm):
    """Form for creating and editing businesses"""
    class Meta:
        model = Business
        fields = ['name', 'logo', 'primary_color']
        widgets = {
            'name': forms.TextInput(attrs={'class': 'form-control'}),
            'logo': forms.FileInput(attrs={'class': 'form-control'}),
            'primary_color': forms.TextInput(attrs={
                'class': 'form-control',
                'type': 'color'
            })
        }

class AssessmentCreationForm(forms.ModelForm):
    """Form for HR users to create new assessments with multiple manager selection"""
    
    # Add a multiple-select field for managers
    selected_managers = forms.ModelMultipleChoiceField(
        queryset=Manager.objects.none(),
        required=True,
        widget=forms.CheckboxSelectMultiple(attrs={'class': 'manager-checkbox-list'}),
        label="Select Managers to Notify"
    )
    
    # Add a field to select the primary manager
    primary_manager = forms.ModelChoiceField(
        queryset=Manager.objects.none(),
        required=True,
        empty_label="Select Primary Manager",
        widget=forms.Select(attrs={'class': 'form-control'}),
        label="Primary Contact for Communication"
    )
    
    class Meta:
        model = Assessment
        fields = [
            'candidate_name', 
            'candidate_email', 
            'position',
            'region', 
            'selected_managers',
            'primary_manager',
        ]
        widgets = {
            'candidate_name': forms.TextInput(attrs={'class': 'form-control'}),
            'candidate_email': forms.EmailInput(attrs={'class': 'form-control'}),
            'position': forms.TextInput(attrs={'class': 'form-control'}),
            'region': forms.TextInput(attrs={'class': 'form-control'}),
        }

    def __init__(self, *args, **kwargs):
        # Accept business parameter, defaulting to None
        business = kwargs.pop('business', None)
        # Accept user parameter for automatic manager selection
        user = kwargs.pop('user', None)
        
        super().__init__(*args, **kwargs)
        self.business = business
        
        if business:
            # Get available managers
            managers = Manager.objects.filter(business=business, active=True)
            
            # Set the queryset for both manager fields
            self.fields['selected_managers'].queryset = managers
            self.fields['primary_manager'].queryset = managers
            
            # Add help text
            self.fields['selected_managers'].help_text = "These managers will be notified when the assessment is completed"
            self.fields['primary_manager'].help_text = "This manager's name will appear as the sender on emails"
            
            # Auto-select default managers if not already in initial
            default_managers = managers.filter(is_default=True)
            if default_managers.exists():
                if 'selected_managers' not in self.initial:
                    self.initial['selected_managers'] = default_managers
                else:
                    # Make sure all default managers are included in the initial selection
                    current_selections = self.initial['selected_managers']
                    for default_manager in default_managers:
                        if default_manager not in current_selections:
                            if isinstance(current_selections, list):
                                current_selections.append(default_manager)
                            else:
                                self.initial['selected_managers'] = list(current_selections) + [default_manager]
            
            # If user provided and they match a manager, auto-select them as primary and in the selected managers
            if user:
                user_manager = managers.filter(email=user.email).first()
                if user_manager:
                    # Set as primary manager if not already set
                    if not self.initial.get('primary_manager'):
                        self.initial['primary_manager'] = user_manager
                    
                    # Ensure the current user is in selected_managers
                    if 'selected_managers' not in self.initial:
                        self.initial['selected_managers'] = [user_manager]
                    elif user_manager not in self.initial['selected_managers']:
                        if isinstance(self.initial['selected_managers'], list):
                            self.initial['selected_managers'].append(user_manager)
                        else:
                            self.initial['selected_managers'] = list(self.initial['selected_managers']) + [user_manager]
        
    def clean(self):
        cleaned_data = super().clean()
        selected_managers = cleaned_data.get('selected_managers', [])
        primary_manager = cleaned_data.get('primary_manager')
        
        # Ensure default managers and current user (if a manager) are always included
        if self.business:
            # Get default managers
            default_managers = Manager.objects.filter(business=self.business, is_default=True)
            
            # Convert to list if it's not already
            if not isinstance(selected_managers, list):
                selected_managers = list(selected_managers)
                
            # Add any missing default managers
            for default_manager in default_managers:
                if default_manager not in selected_managers:
                    selected_managers.append(default_manager)
            
            # If the current user matches a manager, make sure they're included too
            current_user_email = self.instance.created_by.email if hasattr(self.instance, 'created_by') and self.instance.created_by else None
            if current_user_email:
                user_manager = Manager.objects.filter(business=self.business, email=current_user_email, active=True).first()
                if user_manager and user_manager not in selected_managers:
                    selected_managers.append(user_manager)
            
            cleaned_data['selected_managers'] = selected_managers
        
        # Ensure primary manager is in selected managers
        if primary_manager and selected_managers and primary_manager not in selected_managers:
            # Auto-add primary manager to selected managers
            cleaned_data['selected_managers'] = list(selected_managers) + [primary_manager]
        
        # Even though these fields aren't in the form, we need to set them for the model
        if primary_manager:
            cleaned_data['manager_name'] = primary_manager.name
            cleaned_data['manager_email'] = primary_manager.email
        
        return cleaned_data

    def clean_candidate_email(self):
        email = self.cleaned_data['candidate_email']
        # Only perform check if business is set
        if self.business and Assessment.objects.filter(
            candidate_email=email,
            completed=False,
            business=self.business
        ).exists():
            raise ValidationError('This candidate already has an active assessment in your organization.')
        return email
        
    def save(self, commit=True):
        # Get manager details from primary_manager before saving
        if self.cleaned_data.get('primary_manager'):
            self.instance.manager_name = self.cleaned_data['primary_manager'].name
            self.instance.manager_email = self.cleaned_data['primary_manager'].email
            
        assessment = super().save(commit=commit)
        
        if commit and self.cleaned_data.get('selected_managers'):
            # Ensure default managers are always included
            if self.business:
                default_manager_ids = set(
                    Manager.objects.filter(business=self.business, is_default=True)
                    .values_list('id', flat=True)
                )
                
                # Get the selected manager IDs
                selected_manager_ids = set(
                    manager.id for manager in self.cleaned_data['selected_managers']
                )
                
                # Make sure all default manager IDs are included
                selected_manager_ids.update(default_manager_ids)
                
                # Set the managers with the combined set
                assessment.managers.set(Manager.objects.filter(id__in=selected_manager_ids))
            else:
                # If no business context, just use the selected managers
                assessment.managers.set(self.cleaned_data['selected_managers'])
            
        return assessment

class BenchmarkBatchForm(forms.ModelForm):
    """Form for creating benchmark assessment batches"""
    class Meta:
        model = BenchmarkBatch
        fields = ['name', 'data_file']
        widgets = {
            'name': forms.TextInput(attrs={'class': 'form-control'}),
            'data_file': forms.FileInput(attrs={'class': 'form-control'})
        }
        help_texts = {
            'data_file': 'Upload an Excel (.xlsx, .xls) or CSV file with columns: name, email'
        }

    def clean_data_file(self):
        data_file = self.cleaned_data['data_file']
        
        # Validate file extension
        valid_extensions = ['.xlsx', '.xls', '.csv']
        ext = str(data_file.name).lower()[-4:]
        if ext not in valid_extensions:
            raise ValidationError('Invalid file format. Please upload an Excel or CSV file.')
        
        # Validate file size (max 5MB)
        if data_file.size > 5 * 1024 * 1024:
            raise ValidationError('File size must be under 5MB.')
            
        return data_file

class AssessmentResponseForm(forms.Form):
    """Form for candidates to complete their assessment"""
    
    def __init__(self, *args, **kwargs):
        question_pairs = kwargs.pop('question_pairs', [])
        super().__init__(*args, **kwargs)
        
        for index, pair in enumerate(question_pairs, start=1):
            field_name = f'question_{pair.id}'
            self.fields[field_name] = forms.ChoiceField(
                choices=[
                    ('A', pair.statement_a),
                    ('B', pair.statement_b)
                ],
                widget=forms.RadioSelect(attrs={
                    'class': 'form-check-input',
                    'required': True,
                    'data-question-id': pair.id
                }),
                label=f'Statement Pairing {index}',  # Generic labeling
                required=True,
                error_messages={
                    'required': 'Please select an answer for this question.'
                }
            )
    
    def clean(self):
        cleaned_data = super().clean()
        unanswered = []
        
        for field_name in self.fields:
            if field_name not in cleaned_data:
                unanswered.append(field_name.replace('question_', ''))
        
        if unanswered:
            raise ValidationError(
                'Please answer all questions before submitting. '
                f'Missing answers for questions: {", ".join(unanswered)}'
            )
        
        return cleaned_data

class AttributeForm(forms.ModelForm):
    """Form for creating and editing attributes"""
    class Meta:
        model = Attribute
        fields = ['name', 'description', 'order', 'active']
        widgets = {
            'name': forms.TextInput(attrs={'class': 'form-control'}),
            'description': forms.Textarea(attrs={'class': 'form-control', 'rows': 3}),
            'order': forms.NumberInput(attrs={'class': 'form-control'}),
            'active': forms.CheckboxInput(attrs={'class': 'form-check-input'})
        }

class QuestionPairForm(forms.ModelForm):
    """Form for creating and editing question pairs"""
    class Meta:
        model = QuestionPair
        fields = ['attribute1', 'attribute2', 'statement_a', 'statement_b', 'order', 'active']
        widgets = {
            'attribute1': forms.Select(attrs={'class': 'form-control'}),
            'attribute2': forms.Select(attrs={'class': 'form-control'}),
            'statement_a': forms.Textarea(attrs={'class': 'form-control', 'rows': 3}),
            'statement_b': forms.Textarea(attrs={'class': 'form-control', 'rows': 3}),
            'order': forms.NumberInput(attrs={'class': 'form-control'}),
            'active': forms.CheckboxInput(attrs={'class': 'form-check-input'})
        }

    def __init__(self, *args, **kwargs):
        business = kwargs.pop('business', None)
        super().__init__(*args, **kwargs)
        if business:
            self.fields['attribute1'].queryset = Attribute.objects.filter(business=business)
            self.fields['attribute2'].queryset = Attribute.objects.filter(business=business)

    def clean(self):
        cleaned_data = super().clean()
        attr1 = cleaned_data.get('attribute1')
        attr2 = cleaned_data.get('attribute2')
        
        if attr1 and attr2 and attr1 == attr2:
            raise ValidationError('Cannot compare an attribute with itself.')
            
        return cleaned_data

class LoginForm(forms.Form):
    """Form for user login"""
    username = forms.CharField(
        widget=forms.TextInput(attrs={'class': 'form-control'}),
        max_length=150
    )
    password = forms.CharField(
        widget=forms.PasswordInput(attrs={'class': 'form-control'})
    )

class PasswordResetForm(forms.Form):
    email = forms.EmailField(
        label="Email",
        max_length=254,
        widget=forms.EmailInput(attrs={'class': 'form-control'})
    )

    def clean_email(self):
        email = self.cleaned_data['email']
        if not CustomUser.objects.filter(email=email).exists():
            raise ValidationError("No account found with this email address. Please contact site admin")
        return email
    
class SetNewPasswordForm(forms.Form):
    password1 = forms.CharField(
        label="New Password",
        widget=forms.PasswordInput(attrs={'class': 'form-control'}),
        help_text="Password must be at least 8 characters and contain letters, numbers, and special characters."
    )
    password2 = forms.CharField(
        label="Confirm New Password",
        widget=forms.PasswordInput(attrs={'class': 'form-control'})
    )

    def clean_password1(self):
        password1 = self.cleaned_data.get('password1')
        try:
            validate_password(password1)
        except ValidationError as e:
            raise ValidationError(list(e.messages))
        return password1

    def clean(self):
        cleaned_data = super().clean()
        password1 = cleaned_data.get('password1')
        password2 = cleaned_data.get('password2')

        if password1 and password2 and password1 != password2:
            raise ValidationError("The two password fields didn't match.")
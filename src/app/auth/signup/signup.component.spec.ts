import { TestBed, ComponentFixture } from '@angular/core/testing';
import { SignupComponent } from './signup.component';
import { SupabaseService } from '../../services/supabase.service';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';

describe('SignupComponent', () => {
  let fixture: ComponentFixture<SignupComponent>;
  let component: SignupComponent;
  let mockSupabaseService: {
    signUpWithEmail: any;
    signOut: any;
    verifySignupOtp: any;
    resendConfirmationEmail: any;
  };
  let mockRouter: {
    navigate: any;
  };

  const initialAllowedDomains = environment.allowedEmailDomains;

  beforeEach(async () => {
    environment.allowedEmailDomains = [];

    mockSupabaseService = {
      signUpWithEmail: () => Promise.resolve({ error: null }),
      signOut: () => Promise.resolve(),
      verifySignupOtp: () => Promise.resolve({ data: { session: {} }, error: null }),
      resendConfirmationEmail: () => Promise.resolve({ error: null }),
    };

    mockRouter = {
      navigate: () => {},
    };

    await TestBed.configureTestingModule({
      imports: [SignupComponent],
      providers: [
        { provide: SupabaseService, useValue: mockSupabaseService },
        { provide: Router, useValue: mockRouter },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SignupComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    environment.allowedEmailDomains = initialAllowedDomains;
  });

  it('should create SignupComponent', () => {
    expect(component).toBeTruthy();
  });

  it('should validate required fields', async () => {
    component.name.set('');
    component.email.set('');
    component.password.set('');
    component.confirmPassword.set('');

    await component.signUp();

    expect(component.errorMessage()).toBe('Veuillez remplir tous les champs.');
  });

  it('should validate password length', async () => {
    component.name.set('Jean Dupont');
    component.email.set('jean.dupont@test.com');
    component.password.set('123');
    component.confirmPassword.set('123');

    await component.signUp();

    expect(component.errorMessage()).toBe('Le mot de passe doit contenir au moins 6 caractères.');
  });

  it('should validate password match', async () => {
    component.name.set('Jean Dupont');
    component.email.set('jean.dupont@test.com');
    component.password.set('password123');
    component.confirmPassword.set('password456');

    await component.signUp();

    expect(component.errorMessage()).toBe('Les mots de passe ne correspondent pas.');
  });

  it('should block signup if email domain is not allowed', async () => {
    environment.allowedEmailDomains = ['soprasteria.com'];
    let signUpCalled = false;
    mockSupabaseService.signUpWithEmail = () => {
      signUpCalled = true;
      return Promise.resolve({ error: null });
    };

    component.name.set('Jean Dupont');
    component.email.set('jean.dupont@gmail.com');
    component.password.set('password123');
    component.confirmPassword.set('password123');

    await component.signUp();

    expect(signUpCalled).toBe(false);
    expect(component.errorMessage()).toBe('Seules les adresses e-mail du domaine @soprasteria.com sont autorisées.');
  });

  it('should allow signup and call service if email domain is allowed', async () => {
    environment.allowedEmailDomains = ['soprasteria.com'];
    let payloadSent: any = null;
    mockSupabaseService.signUpWithEmail = (payload: any) => {
      payloadSent = payload;
      return Promise.resolve({ error: null });
    };

    component.name.set('Jean Dupont');
    component.email.set('JEAN.DUPONT@SOPRASTERIA.COM');
    component.password.set('password123');
    component.confirmPassword.set('password123');

    await component.signUp();

    expect(payloadSent).toBeTruthy();
    expect(payloadSent.email).toBe('JEAN.DUPONT@SOPRASTERIA.COM');
    expect(component.errorMessage()).toBeNull();
    expect(component.step()).toBe('verify-otp');
    expect(component.successMessage()).toContain('Compte créé');
  });

  it('should handle error returned from supabaseService.signUpWithEmail', async () => {
    environment.allowedEmailDomains = [];
    mockSupabaseService.signUpWithEmail = () => {
      return Promise.resolve({ error: { message: 'Cet utilisateur existe déjà.' } });
    };

    component.name.set('Jean Dupont');
    component.email.set('jean.dupont@test.com');
    component.password.set('password123');
    component.confirmPassword.set('password123');

    await component.signUp();

    expect(component.errorMessage()).toBe('Cet utilisateur existe déjà.');
    expect(component.step()).toBe('form');
  });

  it('should verify OTP and navigate on success', async () => {
    let verifyCalledWith: { email: string; token: string } | null = null;
    mockSupabaseService.verifySignupOtp = (email: string, token: string) => {
      verifyCalledWith = { email, token };
      return Promise.resolve({ data: { session: {} }, error: null });
    };

    component.email.set('test@soprasteria.com');
    component.otpCode.set('123456');

    await component.verifyOtp();

    expect(verifyCalledWith).toEqual({ email: 'test@soprasteria.com', token: '123456' });
    expect(component.successMessage()).toContain('confirmé avec succès');
  });

  it('should handle invalid OTP error', async () => {
    mockSupabaseService.verifySignupOtp = () => {
      return Promise.reject(new Error('Code de confirmation invalide ou expiré.'));
    };

    component.email.set('test@soprasteria.com');
    component.otpCode.set('000000');

    await component.verifyOtp();

    expect(component.errorMessage()).toBe('Code de confirmation invalide ou expiré.');
  });

  it('should resend OTP code', async () => {
    let resendCalledWith = '';
    mockSupabaseService.resendConfirmationEmail = (email: string) => {
      resendCalledWith = email;
      return Promise.resolve({ error: null });
    };

    component.email.set('test@soprasteria.com');
    await component.resendOtp();

    expect(resendCalledWith).toBe('test@soprasteria.com');
    expect(component.successMessage()).toContain('Un nouveau code');
  });
});

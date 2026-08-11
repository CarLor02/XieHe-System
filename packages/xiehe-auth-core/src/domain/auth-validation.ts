export interface LoginFormValue {
  username: string;
  password: string;
}

export interface RegisterFormValue {
  username: string;
  email: string;
  password: string;
  confirm_password: string;
  full_name: string;
  phone?: string;
}

export type FormValidationErrors = Record<string, string>;

export function validateLoginForm(input: LoginFormValue): FormValidationErrors {
  const errors: FormValidationErrors = {};
  if (!input.username.trim()) errors.username = '请输入用户名或邮箱';
  if (!input.password) errors.password = '请输入密码';
  else if (input.password.length < 6) errors.password = '密码至少6位';
  return errors;
}

export function validateRegisterForm(
  input: RegisterFormValue
): FormValidationErrors {
  const errors: FormValidationErrors = {};
  if (!input.username.trim()) errors.username = '请输入用户名';
  else if (input.username.length < 3) errors.username = '用户名至少3位';
  else if (!/^[a-zA-Z0-9_]+$/.test(input.username)) {
    errors.username = '用户名只能包含字母、数字和下划线';
  }
  if (!input.email.trim()) errors.email = '请输入邮箱';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) {
    errors.email = '请输入有效的邮箱地址';
  }
  if (!input.password) errors.password = '请输入密码';
  else if (input.password.length < 6) errors.password = '密码至少6位';
  else if (!/(?=.*[a-zA-Z])(?=.*\d)/.test(input.password)) {
    errors.password = '密码必须包含字母和数字';
  }
  if (!input.confirm_password) errors.confirm_password = '请确认密码';
  else if (input.password !== input.confirm_password) {
    errors.confirm_password = '两次输入的密码不一致';
  }
  if (!input.full_name.trim()) errors.full_name = '请输入姓名';
  else if (input.full_name.length < 2) errors.full_name = '姓名至少2位';
  if (input.phone && !/^1[3-9]\d{9}$/.test(input.phone)) {
    errors.phone = '请输入有效的手机号';
  }
  return errors;
}

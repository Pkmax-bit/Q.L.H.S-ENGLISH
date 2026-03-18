export function required(value, fieldName) {
  if (!value || (typeof value === 'string' && !value.trim())) {
    return `${fieldName} không được để trống`
  }
  return null
}

export function email(value) {
  if (!value) return null
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!re.test(value)) {
    return 'Email không hợp lệ'
  }
  return null
}

export function phone(value) {
  if (!value) return null
  const re = /^(0|\+84)[0-9]{9,10}$/
  if (!re.test(value.replace(/\s/g, ''))) {
    return 'Số điện thoại không hợp lệ'
  }
  return null
}

export function minLength(value, min, fieldName) {
  if (!value) return null
  if (value.length < min) {
    return `${fieldName} phải có ít nhất ${min} ký tự`
  }
  return null
}

export function positiveNumber(value, fieldName) {
  if (value === '' || value == null) return null
  const num = Number(value)
  if (isNaN(num) || num < 0) {
    return `${fieldName} phải là số không âm`
  }
  return null
}

export function validateForm(rules) {
  const errors = {}
  for (const [field, validators] of Object.entries(rules)) {
    for (const validator of validators) {
      const error = validator()
      if (error) {
        errors[field] = error
        break
      }
    }
  }
  return errors
}

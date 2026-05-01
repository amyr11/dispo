export class UnauthorizedError extends Error {
  constructor(message = "Unauthorized") {
    super(message)
    this.name = "UnauthorizedError"
  }
}

export class ProfileRequiredError extends Error {
  constructor(message = "Profile setup required") {
    super(message)
    this.name = "ProfileRequiredError"
  }
}

export class ProfileLookupError extends Error {
  constructor(message = "Unable to load profile") {
    super(message)
    this.name = "ProfileLookupError"
  }
}

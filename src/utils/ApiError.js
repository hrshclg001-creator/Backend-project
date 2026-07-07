
class ApiError extends Error{
	constructor(
		statusCode,
		message= "Something went wrong!",
		errors = [],
		stack = ""
	){
		super(message)
		// custom properties
		this.statusCode = statusCode
		this.data = null
		this.message = message
		this.success = false
		this.errors = errors
		if(stack){
			this.stack = stack
		}else{
      Error.captureStackTrace(this, this.constructor); //"Stack Trace" ka matlab hota hai pura rasta (path) dikhana ki error exactly kis file aur kis line number par aayi hai.
    }
	}
}
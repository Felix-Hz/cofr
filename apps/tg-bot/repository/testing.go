package repository

// SetForTest replaces the repository singleton (test use only).
func SetForTest(repos *Repositories) { instance = repos }

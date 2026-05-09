package storage

type ObjectRef struct {
	Bucket    string
	ObjectKey string
}

type ObjectStat struct {
	Bucket      string
	ObjectKey   string
	Size        int64
	ETag        string
	ContentType string
	Metadata    map[string]string
}

type PutObjectResult struct {
	Bucket    string
	ObjectKey string
	ETag      string
}

func (ref ObjectRef) Validate() error {
	if ref.Bucket == "" {
		return ErrBucketRequired
	}
	if ref.ObjectKey == "" {
		return ErrObjectKeyRequired
	}
	return nil
}

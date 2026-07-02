import { Router } from 'express';
import multer from 'multer';
import { getSupabaseAdmin } from '../supabase.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post('/submission-file', upload.single('file'), async (req, res) => {
  try {
    const { formId, fieldId, submissionId } = req.body;
    const file = req.file;

    if (!file || !formId || !fieldId || !submissionId) {
      return res.status(400).json({ error: 'Missing required parameters or file.' });
    }

    const supabaseAdmin = getSupabaseAdmin();

    // 1. Fetch Form Schema to validate
    const { data: form, error: formError } = await supabaseAdmin
      .from('program_forms')
      .select('schema')
      .eq('id', formId)
      .single();

    if (formError || !form) {
      return res.status(404).json({ error: 'Form not found.' });
    }

    const schema = (form.schema || []) as any[];
    // Find the field in the schema pages
    let fieldConfig = null;
    for (const page of schema) {
      if (page.fields) {
        const found = page.fields.find((f: any) => f.id === fieldId);
        if (found) {
          fieldConfig = found;
          break;
        }
      }
    }

    if (!fieldConfig) {
      return res.status(404).json({ error: 'Field configuration not found in form.' });
    }

    // 2. Validate Type (Image vs File)
    if (fieldConfig.type === 'image') {
      if (!file.mimetype.startsWith('image/')) {
        return res.status(400).json({ error: 'Invalid file type. Only images are allowed.' });
      }
      const maxMB = fieldConfig.validation?.maxFileSize || 10;
      if (file.size > maxMB * 1024 * 1024) {
        return res.status(400).json({ error: `Image exceeds maximum size of ${maxMB}MB.` });
      }
    } else if (fieldConfig.type === 'file') {
      const maxMB = fieldConfig.validation?.maxFileSize || 20;
      if (file.size > maxMB * 1024 * 1024) {
        return res.status(400).json({ error: `File exceeds maximum size of ${maxMB}MB.` });
      }

      const allowedExtStr = fieldConfig.validation?.allowedExtensions;
      if (allowedExtStr) {
        const allowedExts = allowedExtStr.split(',').map((s: string) => s.trim().toLowerCase());
        const originalName = file.originalname.toLowerCase();
        const isValidExt = allowedExts.some((ext: string) => originalName.endsWith(ext));
        if (!isValidExt) {
          return res.status(400).json({ error: `Invalid file type. Allowed: ${allowedExtStr}` });
        }
      }
    } else {
      return res.status(400).json({ error: 'Field is not a file or image upload type.' });
    }

    // 3. Upload to Supabase Storage securely via Service Role
    const bucket = process.env.VITE_STORAGE_BUCKET_SUBMISSIONS || 'media';
    const fileName = `submissions/${submissionId}/${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from(bucket)
      .upload(fileName, file.buffer, {
        contentType: file.mimetype,
        upsert: false
      });

    if (uploadError || !uploadData) {
      console.error('Upload Error:', uploadError);
      return res.status(500).json({ error: uploadError?.message || 'Failed to upload to storage.' });
    }

    return res.status(200).json({
      path: uploadData.path,
      bucket: bucket
    });

  } catch (err: any) {
    console.error('Server error during upload:', err);
    return res.status(500).json({ error: 'Internal server error during upload.' });
  }
});

export default router;

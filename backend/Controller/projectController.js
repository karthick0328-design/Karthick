// Controller/projectController.js
const Project = require('../models/Project');
const User = require('../models/User');
const mongoose = require('mongoose');
const querystring = require('querystring');
const Conversation = require('../models/Conversation'); // NEW: Chat integration
const Message = require('../models/Message'); // NEW: Chat integration
const AuditEvent = require('../models/AuditEvent'); // NEW: Chat integration
const Drive = require('../models/Drive'); // NEW: Storage tracking
const fs = require('fs');
const { checkStorageLimit, registerFilesToDrive } = require('../utils/driveUtils');
const { safeUnlinkMultiple } = require('../utils/fileUtils');


// Robust Service Normalization
const normalizeService = (str) => (str || '').toLowerCase().trim().replace(/[-\s]+/g, ' ');

// Department-specific required fields configuration (UNCHANGED)
const departmentFormFields = {
  'Drug Discovery': {
    requiredFields: ['titleProject', 'targetPosition', 'methodology', 'expectedOutcome', 'compoundDetailsOrInformation', 'timeline', 'services'],
    fieldTypes: {
      titleProject: 'string',
      targetPosition: 'string',
      methodology: 'textarea',
      expectedOutcome: 'textarea',
      compoundDetailsOrInformation: 'textarea',
      timeline: 'date',
      services: {
        type: 'multi-enum', options: [
          'Virtual screening + Docking',
          'ADMET Prediction',
          'Toxicity Profiling of compounds',
          'QSAR modelling',
          'Ligand Search and Creation compound chemistry',
          'MD Simulantor'
        ]
      },
    },
    servicesOptions: [
      'Virtual screening + Docking',
      'ADMET Prediction',
      'Toxicity Profiling of compounds',
      'QSAR modelling',
      'Ligand Search and Creation compound chemistry',
      'MD Simulantor'
    ],
    // Conditional fields (only shown/validated if condition services selected)
    conditionalFields: {
      mdEngine: { type: 'enum', options: ['growmax', 'amper', 'desmomd'], condition: ['MD Simulantor'] },
      dockingSoftware: { type: 'enum', options: ['AutoDock', 'Glide', 'GOLD'], condition: ['Virtual screening + Docking'] },
      admetModel: { type: 'enum', options: ['SwissADME', 'pkCSM', 'ADMETlab'], condition: ['ADMET Prediction'] },
      toxicityAssay: { type: 'string', condition: ['Toxicity Profiling of compounds'] },
      qsarDescriptors: { type: 'multi-enum', options: ['Molecular Weight', 'LogP', 'TPSA'], condition: ['QSAR modelling'] },
      ligandSource: { type: 'enum', options: ['PubChem', 'ZINC', 'Custom'], condition: ['Ligand Search and Creation compound chemistry'] },
    },
  },
  'NGS': {
    requiredFields: ['sampleName', 'volume', 'species', 'preparationDate', 'concentration', 'totalAmount', 'od260280', 'remarks', 'ratio28s18s', 'services'],
    fieldTypes: {
      sampleName: 'string',
      volume: 'number',
      species: 'string',
      preparationDate: 'date',
      concentration: 'number',
      totalAmount: 'number',
      od260280: 'number',
      remarks: 'string',
      ratio28s18s: 'number',
      services: {
        type: 'multi-enum', options: [
          'Whole genome / genome analysis',
          'RNA-sequence differential expression analysis',
          'Metagenomics (16S and shotgun)',
          'Microbiomes profiling',
          'Variant annotation and reporting',
          'Oncogenomics: tumor-normal analysis',
          'Pharmacogenomics'
        ]
      },
    },
    servicesOptions: [
      'Whole genome / genome analysis',
      'RNA-sequence differential expression analysis',
      'Metagenomics (16S and shotgun)',
      'Microbiomes profiling',
      'Variant annotation and reporting',
      'Oncogenomics: tumor-normal analysis',
      'Pharmacogenomics'
    ],
    // Conditional fields for NGS services
    conditionalFields: {
      genomeCoverage: { type: 'number', condition: ['Whole genome / genome analysis'] },
      genomeType: { type: 'enum', options: ['Whole Genome', 'Exome', 'Targeted Panel'], condition: ['Whole genome / genome analysis'] },
      sampleGroups: { type: 'string', condition: ['RNA-sequence differential expression analysis'] },
      replicates: { type: 'number', condition: ['RNA-sequence differential expression analysis'] },
      sequencingPlatform: { type: 'enum', options: ['16S', 'Shotgun'], condition: ['Metagenomics (16S and shotgun)'] },
      microbiomeType: { type: 'string', condition: ['Microbiomes profiling'] },
      variantCaller: { type: 'enum', options: ['GATK', 'FreeBayes', 'DeepVariant'], condition: ['Variant annotation and reporting'] },
      tumorNormalPair: { type: 'enum', options: ['Matched', 'Unmatched'], condition: ['Oncogenomics: tumor-normal analysis'] },
      pgxGenes: { type: 'multi-enum', options: ['CYP2D6', 'TPMT', 'VKORC1'], condition: ['Pharmacogenomics'] },
    },
  },
  'Software Development': {
    requiredFields: ['projectName', 'description', 'techStack', 'requirements', 'timeline', 'teamSize', 'budgetEstimate', 'remarks'],
    fieldTypes: {
      projectName: 'string',
      description: 'string',
      techStack: ['string'],
      requirements: 'string',
      timeline: 'date',
      teamSize: 'number',
      budgetEstimate: 'number',
      remarks: 'string',
    },
  },
  'Microbiology': {
    requiredFields: ['sampleName', 'volume', 'species', 'preparationDate', 'concentration', 'totalAmount', 'od260280', 'remarks', 'ratio28s18s'],
    fieldTypes: {
      sampleName: 'string',
      volume: 'number',
      species: 'string',
      preparationDate: 'date',
      concentration: 'number',
      totalAmount: 'number',
      od260280: 'number',
      remarks: 'string',
      ratio28s18s: 'number',
    },
  },
  'Biochemistry': {
    requiredFields: ['sampleName', 'volume', 'species', 'preparationDate', 'concentration', 'totalAmount', 'od260280', 'remarks', 'ratio28s18s'],
    fieldTypes: {
      sampleName: 'string',
      volume: 'number',
      species: 'string',
      preparationDate: 'date',
      concentration: 'number',
      totalAmount: 'number',
      od260280: 'number',
      remarks: 'string',
      ratio28s18s: 'number',
    },
  },
  'Molecular Biology': {
    requiredFields: ['sampleName', 'volume', 'species', 'preparationDate', 'concentration', 'totalAmount', 'od260280', 'remarks', 'ratio28s18s'],
    fieldTypes: {
      sampleName: 'string',
      volume: 'number',
      species: 'string',
      preparationDate: 'date',
      concentration: 'number',
      totalAmount: 'number',
      od260280: 'number',
      remarks: 'string',
      ratio28s18s: 'number',
    },
  },
  'Biochemistry and Molecular Biology': { // Legacy/Fallback
    requiredFields: ['sampleName', 'volume', 'species', 'preparationDate', 'concentration', 'totalAmount', 'od260280', 'remarks', 'ratio28s18s'],
    fieldTypes: {
      sampleName: 'string',
      volume: 'number',
      species: 'string',
      preparationDate: 'date',
      concentration: 'number',
      totalAmount: 'number',
      od260280: 'number',
      remarks: 'string',
      ratio28s18s: 'number',
    },
  },
  'IT': {
    requiredFields: ['projectName', 'description', 'techStack', 'requirements', 'timeline', 'teamSize', 'budgetEstimate', 'remarks'],
    fieldTypes: {
      projectName: 'string',
      description: 'string',
      techStack: ['string'],
      requirements: 'string',
      timeline: 'date',
      teamSize: 'number',
      budgetEstimate: 'number',
      remarks: 'string',
    },
  },
  'Sales & Customer Support': {
    requiredFields: ['clientName', 'projectDescription', 'expectedRevenue', 'timeline', 'resourcesNeeded', 'remarks'],
    fieldTypes: {
      clientName: 'string',
      projectDescription: 'string',
      expectedRevenue: 'number',
      timeline: 'date',
      resourcesNeeded: 'string',
      remarks: 'string',
    },
  },
};
// Helper to check for Sales Manager role (Global)
const checkIsSalesManager = (user) => {
  if (!user) return false;
  const role = user.role?.toLowerCase();

  if (role === 'admin' || role === 'superadmin') return true;
  if (role !== 'manager') return false;

  const normalizedDept = (user.department || '').trim().toLowerCase().replace(/&/g, 'and');
  // Sales Manager: in Sales dept
  const isSalesDept = normalizedDept.includes('sale') ||
    normalizedDept === 'services' ||
    normalizedDept === 'customer services' ||
    ['sales and customer services', 'sales and customer support', 'customer services'].includes(normalizedDept);

  return isSalesDept;
};

// NEW: Helper to check for Financial Personnel (Manager/Employee/Authorized)
const checkIsFinancialPersonnel = (user) => {
  if (!user) return false;
  const role = user.role?.toLowerCase();
  const dept = (user.department || '').toLowerCase().replace(/\s+/g, '-').replace(/&/g, 'and');
  const isFinDept = dept.includes('financial') || dept.includes('finance');
  const hasAccess = (user.financeAccess || []).some(a =>
    a === 'salary' || a === 'purchase' || a === 'service' || a.startsWith('service:')
  );
  return role === 'admin' || role === 'superadmin' || (isFinDept && (role === 'manager' || role === 'employee')) || hasAccess;
};

// NEW: Helper to map validation errors to frontend format (fixes ReferenceError on 400 responses)
const mapErrorsToFrontend = (errors) => {
  const backendErrors = {};
  errors.forEach((error) => {
    // Infer field from error message (e.g., "services is required" -> field: 'services')
    const match = error.match(/^([a-zA-Z0-9_]+)\s+(is required|Invalid type)/i);
    const field = match ? match[1].toLowerCase() : 'general';
    if (!backendErrors[field]) {
      backendErrors[field] = [];
    }
    backendErrors[field].push(error);
  });
  // Convert to array of {field, message} for frontend grouping
  return Object.entries(backendErrors).map(([field, msgs]) => ({
    field,
    message: msgs.join('; ') // Combine multi-errors per field
  }));
};
// UPDATED: Helper function for type validation (extracted for reuse) - Now handles object types for number/date in conditional fields
const validateFieldType = (expectedType, value, config) => {
  let typeStr;
  if (typeof expectedType === 'object' && !Array.isArray(expectedType) && 'type' in expectedType) {
    typeStr = expectedType.type;
    // For enums
    if (typeStr === 'multi-enum') {
      const fieldOptions = expectedType.options || config.servicesOptions || [];
      const invalidItems = Array.isArray(value) ? value.filter(item => !fieldOptions.includes(item)) : [];
      return invalidItems.length > 0;
    } else if (typeStr === 'enum' && expectedType.options && !expectedType.options.includes(value)) {
      return true;
    } else if (typeStr === 'number' && isNaN(Number(value))) {
      return true;
    } else if (typeStr === 'date' && isNaN(Date.parse(value))) {
      return true;
    }
    return false;
  } else if (typeof expectedType === 'string') {
    if (expectedType === 'number' && isNaN(Number(value))) {
      return true;
    } else if (expectedType === 'date' && isNaN(Date.parse(value))) {
      return true;
    }
  }
  return false;
};
// Helper to build project query (reusable)
const buildProjectQuery = (id) => {
  if (mongoose.Types.ObjectId.isValid(id)) {
    return { _id: id };
  } else {
    return { uniqueId: id };
  }
};
// UPDATED: Helper function to validate formData against department specs (ENHANCED: Now handles conditionalFields - validate only if condition met based on selected services; includes remarks)
const validateFormData = (department, category, formData, remarks = '') => {
  if (category !== 'New Project') {
    return { isValid: true, errors: [] };
  }
  // Include remarks in formData for validation
  const fullFormData = { ...formData, remarks: remarks || '' };
  // Robust department matching
  const originalDepartment = String(department || '');
  const titleCased = originalDepartment.toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
  const upperCased = originalDepartment.toUpperCase();
  const possibleDepartments = [originalDepartment, titleCased, upperCased];
  let config;
  for (const dept of possibleDepartments) {
    if (departmentFormFields[dept]) {
      config = departmentFormFields[dept];
      break;
    }
  }
  if (!config) {
    config = departmentFormFields['IT'];
  }
  if (!config) {
    return { isValid: false, errors: ['Invalid department for form validation'] };
  }
  const errors = [];
  const requiredFields = config.requiredFields;
  // Validate base required fields (including services and remarks)
  requiredFields.forEach(field => {
    if (!fullFormData || fullFormData[field] === undefined || fullFormData[field] === '' || (Array.isArray(fullFormData[field]) && fullFormData[field].length === 0)) {
      errors.push(`${field} is required`);
    } else {
      // Type validation for base fields
      const expectedType = config.fieldTypes[field];
      if (expectedType && validateFieldType(expectedType, fullFormData[field], config)) {
        errors.push(`Invalid type for ${field}`);
      }
    }
  });
  // Validate conditional fields
  const selectedServices = Array.isArray(fullFormData.services) ? fullFormData.services : [];
  if (config.conditionalFields) {
    Object.entries(config.conditionalFields).forEach(([field, fieldConfig]) => {
      const conditionMet = fieldConfig.condition.some(service => selectedServices.includes(service));
      if (conditionMet) {
        // Conditional field is required if condition met
        if (!fullFormData[field] || fullFormData[field] === '' || (Array.isArray(fullFormData[field]) && fullFormData[field].length === 0)) {
          errors.push(`${field} is required for selected service(s)`);
        } else {
          // Type validation for conditional field
          if (fieldConfig.type && validateFieldType(fieldConfig, fullFormData[field], config)) {
            errors.push(`Invalid type for ${field}`);
          }
        }
      }
    });
  }
  return { isValid: errors.length === 0, errors };
};

// createProject now directly submits (no Draft status) - validates and sets to Submitted
const createProject = async (req, res) => {
  try {
    console.log(`[${new Date().toISOString()}] Creating and submitting project for user: ${req.user.id}`);

    // Extract data from multipart/form-data (strings when sent via FormData)
    let { department, category = 'New Project', formData, remarks } = req.body;

    // Parse JSON if strings (common with multipart/form-data)
    if (typeof formData === 'string') {
      try { formData = JSON.parse(formData); } catch (e) { console.error('Error parsing formData', e); }
    }
    if (typeof remarks === 'string' && remarks.startsWith('{')) {
      // Just in case it's sent as JSON
      try { remarks = JSON.parse(remarks); } catch (e) { /* use as string */ }
    }

    if (!department || !category) {
      return res.status(400).json({ success: false, message: 'Department and category are required' });
    }

    // Handle uploaded files
    const attachments = (req.files || []).map(file => {
      const absolutePath = file.path.replace(/\\/g, '/');
      const relativePath = absolutePath.includes('uploads/')
        ? 'uploads/' + absolutePath.split('uploads/')[1]
        : absolutePath;

      return {
        path: relativePath,
        filename: file.originalname,
        mimetype: file.mimetype,
        size: file.size
      };
    });

    // NEW: Check Storage Limit if there are attachments
    if (attachments.length > 0) {
      const totalSize = attachments.reduce((acc, f) => acc + (f.size || 0), 0);
      const storageCheck = await checkStorageLimit(req.user.id, totalSize);
      if (!storageCheck.allowed) {
        // Cleanup uploaded files safely
        safeUnlinkMultiple(req.files);
        return res.status(400).json({

          success: false,
          message: `Storage limit exceeded. Project creation failed. Remaining: ${storageCheck.remainingMB} MB.`
        });
      }
    }

    // Validate formData immediately (since no Draft) - UPDATED: Include remarks
    const validation = validateFormData(department, category, formData || {}, remarks || '');
    if (!validation.isValid) {
      console.log(`[${new Date().toISOString()}] Validation failed on create:`, validation.errors, 'formData keys:', Object.keys(formData || {}));
      // Cleanup files on validation failure safely
      safeUnlinkMultiple(req.files);
      return res.status(400).json({

        success: false,
        message: 'Form validation failed. Please complete all required fields.',
        errors: mapErrorsToFrontend(validation.errors)
      });
    }

    const project = new Project({
      userId: req.user.id,
      department,
      category,
      status: 'Submitted', // Directly Submitted (no Draft)
      formData: formData || {},
      remarks,
      attachments, // Save file metadata
      submittedAt: new Date(), // Set submit timestamp
      assignedTo: [], // Explicitly empty array for unassigned
      paymentStatus: 'Pending', // NEW: Default payment status
    });
    await project.save();

    // NEW: Register project files in Drive model for unified tracking
    if (attachments.length > 0) {
      await registerFilesToDrive(req.user.id, req.files, 'Project Attachment', project._id);
    }
    await project.save();
    // AUTOMATION: Create Project Group Chat
    try {
      const projectGroup = new Conversation({
        type: 'project',
        name: `Project-${project.uniqueId}`,
        description: `Official group for project ${project.uniqueId} (${department})`,
        relatedId: project._id,
        relatedModel: 'Project',
        contextStringType: 'Service',
        contextStringValue: department, // Tag with department/service
        createdBy: req.user.id,
        members: [{ userId: req.user.id, role: 'admin' }] // Owner is admin
      });
      await projectGroup.save();
      const sysMessage = new Message({
        conversationId: projectGroup._id,
        senderId: req.user.id,
        content: `Project ${project.uniqueId} submitted. Awaiting quote from Sales Manager.`,
        contentType: 'system',
        isSystemMessage: true
      });
      await sysMessage.save();
      projectGroup.lastMessage = sysMessage._id;
      projectGroup.lastMessageAt = new Date();
      await projectGroup.save();
      console.log(`[${new Date().toISOString()}] Auto-created Project Group: ${projectGroup._id}`);
      // Log Audit
      await AuditEvent.create({
        actorId: req.user.id,
        action: 'AUTO_CREATE_PROJECT_GROUP',
        targetType: 'Conversation',
        targetId: projectGroup._id
      });
    } catch (chatError) {
      console.error(`[${new Date().toISOString()}] Failed to auto-create project chat:`, chatError);
    }
    await project.logActivity('Project submitted directly - awaiting quote from SalesManager', req.user.id, { statusChange: 'Submitted' });
    await project.populate('userId', 'name email uniqueId');
    console.log(`[${new Date().toISOString()}] Project submitted: ${project.uniqueId}`);
    res.status(201).json({
      success: true,
      data: project,
      message: 'Project submitted successfully. Awaiting quote from SalesManager.'
    });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error creating/submitting project:`, error);
    if (error.name === 'ValidationError') {
      const validationErrors = Object.entries(error.errors).map(([field, err]) => ({
        field,
        message: err.message
      }));
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validationErrors
      });
    }
    res.status(500).json({ success: false, message: 'Server error creating project' });
  }
};
// Get my projects (updated: no Draft filtering, shows all including Submitted; UPDATED: Populate and sort messages for chat visibility)
const getMyProjects = async (req, res) => {
  try {
    console.log(`[${new Date().toISOString()}] Fetching projects for user: ${req.user.id}`);
    const projects = await Project.find({ userId: req.user.id })
      .populate('userId', 'name email uniqueId')
      .populate('reviewerId', 'name email uniqueId')
      .populate('assignedTo', 'name email uniqueId') // NEW: Populate assignedTo for visibility
      .populate('activities.updatedBy', 'name role')
      .populate('messages.senderId', '_id name email uniqueId role') // UPDATED: Populate messages for chat (include _id for frontend comparison)
      .sort({ createdAt: -1 });
    projects.forEach(project => {
      if (project.activities) {
        project.activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      }
      if (project.messages && Array.isArray(project.messages)) { // UPDATED: Sort messages by timestamp
        project.messages.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      }
    });
    res.status(200).json({
      success: true,
      data: projects,
      count: projects.length
    });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error fetching projects:`, error.message);
    res.status(500).json({ success: false, message: 'Server error fetching projects' });
  }
};
// Updated: updateProject (add status handling + ID fix)
// Updated: updateProject (UPDATED: Handle ValidationError; include remarks in validation)
const updateProject = async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`[${new Date().toISOString()}] Updating project: ${id} for user: ${req.user.id}`);
    const projectQuery = buildProjectQuery(id);
    const project = await Project.findOne({ ...projectQuery, userId: req.user.id });
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }
    // Only allow updates if unassigned (Draft or Submitted) and before quoting
    const isUnassignedAndPending = !project.assignedTo || project.assignedTo.length === 0;
    const isBeforeQuote = project.paymentStatus === 'Pending';
    if (!isUnassignedAndPending || !isBeforeQuote) {
      return res.status(403).json({
        success: false,
        message: 'Updates only allowed on unassigned projects before quoting'
      });
    }
    let { department, category, formData, remarks, status } = req.body;
    let hasChanges = false;

    if (typeof formData === 'string') {
      try { formData = JSON.parse(formData); } catch (e) { console.error('Error parsing formData update', e); }
    }
    if (typeof remarks === 'string' && remarks.startsWith('{')) {
      try { remarks = JSON.parse(remarks); } catch (e) { /* use as string */ }
    }

    // Handle new attachments
    const newAttachments = (req.files || []).map(file => {
      const absolutePath = file.path.replace(/\\/g, '/');
      const relativePath = absolutePath.includes('uploads/')
        ? 'uploads/' + absolutePath.split('uploads/')[1]
        : absolutePath;

      return {
        path: relativePath,
        filename: file.originalname,
        mimetype: file.mimetype,
        size: file.size
      };
    });

    if (newAttachments.length > 0) {
      const totalSize = newAttachments.reduce((acc, f) => acc + (f.size || 0), 0);
      const storageCheck = await checkStorageLimit(req.user.id, totalSize);
      if (!storageCheck.allowed) {
        safeUnlinkMultiple(req.files);
        return res.status(400).json({
          success: false,
          message: `Storage limit exceeded. Update failed. Remaining: ${storageCheck.remainingMB} MB.`
        });
      }
      project.attachments = [...(project.attachments || []), ...newAttachments];
      hasChanges = true;
      // Register new files in Drive
      const targetUser = project.userId.toString() !== req.user.id.toString() ? project.userId : null;
      await registerFilesToDrive(req.user.id, req.files, 'Project Attachment', project._id, targetUser);
    }

    if (department) {
      project.department = department;
      hasChanges = true;
    }
    if (category) {
      project.category = category;
      hasChanges = true;
    }
    if (formData !== undefined) {
      // Re-validate on update if New Project - UPDATED: Include remarks
      if (category === 'New Project') {
        const currentFormData = { ...formData, remarks: remarks !== undefined ? (remarks || '') : project.remarks || '' };
        const validation = validateFormData(department || project.department, category, currentFormData);
        if (!validation.isValid) {
          console.log(`[${new Date().toISOString()}] Validation failed on update:`, validation.errors, 'formData keys:', Object.keys(formData));
          return res.status(400).json({
            success: false,
            message: 'Form validation failed on update.',
            errors: mapErrorsToFrontend(validation.errors)
          });
        }
      }
      project.formData = formData;
      hasChanges = true;
    }
    if (remarks !== undefined) {
      project.remarks = remarks;
      hasChanges = true;
    }
    if (status !== undefined) {
      if (!['Draft', 'Submitted'].includes(status)) {
        return res.status(400).json({ success: false, message: 'Invalid status for update (must be Draft or Submitted)' });
      }
      if (!isUnassignedAndPending) {
        return res.status(403).json({ success: false, message: 'Cannot change status after assignment' });
      }
      project.status = status;
      hasChanges = true;
    }
    await project.save();
    if (hasChanges) {
      await project.logActivity('Project updated (pre-quote)', req.user.id, { statusChange: project.status });
    }
    await project.populate('userId', 'name email uniqueId');
    res.status(200).json({
      success: true,
      data: project,
      message: status === 'Draft' ? 'Project saved as draft' : 'Project updated successfully'
    });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error updating project:`, error);
    if (error.name === 'ValidationError') {
      const validationErrors = Object.entries(error.errors).map(([field, err]) => ({
        field,
        message: err.message
      }));
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validationErrors
      });
    }
    res.status(500).json({ success: false, message: 'Server error updating project' });
  }
};
// NEW: submitProject (UPDATED: Handle ValidationError; enhanced logging; include remarks)
const submitProject = async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`[${new Date().toISOString()}] Submitting project: ${id} for user: ${req.user.id}`);
    const projectQuery = buildProjectQuery(id);
    const project = await Project.findOne({ ...projectQuery, userId: req.user.id });
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }
    // Allow submit only if Draft or unassigned Submitted
    const isSubmittable = (project.status === 'Draft') || (project.status === 'Submitted' && (!project.assignedTo || project.assignedTo.length === 0));
    if (!isSubmittable) {
      return res.status(403).json({ success: false, message: 'Cannot submit this project (already assigned or invalid status)' });
    }
    // Extract and parse
    let { formData, remarks } = req.body;
    if (typeof formData === 'string') {
      try { formData = JSON.parse(formData); } catch (e) { console.error('Error parsing formData submit', e); }
    }
    if (typeof remarks === 'string' && remarks.startsWith('{')) {
      try { remarks = JSON.parse(remarks); } catch (e) { /* use as string */ }
    }

    // Handle new attachments on submit
    const newAttachments = (req.files || []).map(file => {
      const absolutePath = file.path.replace(/\\/g, '/');
      const relativePath = absolutePath.includes('uploads/')
        ? 'uploads/' + absolutePath.split('uploads/')[1]
        : absolutePath;

      return {
        path: relativePath,
        filename: file.originalname,
        mimetype: file.mimetype,
        size: file.size
      };
    });

    if (newAttachments.length > 0) {
      const totalSize = newAttachments.reduce((acc, f) => acc + (f.size || 0), 0);
      const storageCheck = await checkStorageLimit(req.user.id, totalSize);
      if (!storageCheck.allowed) {
        safeUnlinkMultiple(req.files);
        return res.status(400).json({
          success: false,
          message: `Storage limit exceeded. Submission failed. Remaining: ${storageCheck.remainingMB} MB.`
        });
      }
      project.attachments = [...(project.attachments || []), ...newAttachments];
      // Register new files in Drive
      const targetUser = project.userId.toString() !== req.user.id.toString() ? project.userId : null;
      await registerFilesToDrive(req.user.id, req.files, 'Project', project._id, targetUser);
    }

    // Validate if New Project - UPDATED: Include remarks
    if (project.category === 'New Project') {
      const fullFormData = { ...(formData || project.formData || {}), remarks: remarks || project.remarks || '' };
      const validation = validateFormData(project.department, project.category, fullFormData);
      if (!validation.isValid) {
        console.log(`[${new Date().toISOString()}] Validation failed on submit:`, validation.errors, 'formData keys:', Object.keys(formData || {}), 'department:', project.department);
        return res.status(400).json({
          success: false,
          message: 'Form validation failed on submit',
          errors: mapErrorsToFrontend(validation.errors)
        });
      }
    }
    project.formData = formData || project.formData;
    project.remarks = remarks || project.remarks;
    project.status = 'Submitted';
    project.paymentStatus = 'Pending'; // Ensure pending on submit
    if (!project.submittedAt) project.submittedAt = new Date(); // Set if new submit
    await project.save();
    await project.logActivity('Project submitted for quoting', req.user.id, { statusChange: 'Submitted' });
    await project.populate('userId', 'name email uniqueId');
    res.status(200).json({
      success: true,
      data: project,
      message: 'Project submitted successfully - awaiting quote'
    });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error submitting project:`, error);
    if (error.name === 'ValidationError') {
      const validationErrors = Object.entries(error.errors).map(([field, err]) => ({
        field,
        message: err.message
      }));
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validationErrors
      });
    }
    res.status(500).json({ success: false, message: 'Server error submitting project' });
  }
};
// NEW: Quote amount by SalesManager (UPDATED: Enhanced logging for auth failure)
const quoteAmount = async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, gst, taxHandling, projectProgress, memberCost, baseAmount, discount } = req.body;

    console.log(`[${new Date().toISOString()}] Quote attempt for ${id} by user ${req.user.id} (role: ${req.user.role}, raw dept: ${req.user.department})`);

    const isSales = checkIsSalesManager(req.user);
    const isDeptManager = !isSales && (req.user.role?.toLowerCase() === 'manager' || req.user.role?.toLowerCase() === 'departmentmanager');

    if (!isSales && !isDeptManager) {
      return res.status(403).json({ success: false, message: 'Access denied - Manager access required' });
    }

    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({ success: false, message: 'Valid positive amount required' });
    }

    // Fetch project first to check current state
    const projectQuery = buildProjectQuery(id);
    const project = await Project.findOne(projectQuery);

    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    // Auth check for Dept Manager
    if (isDeptManager && !isSales) {
      if (!project.assignedTo.includes(req.user.id)) {
        return res.status(403).json({ success: false, message: 'Project not assigned to you' });
      }
    }

    // State check
    const quotableStatuses = ['Pending', 'Quote Sent', 'Payment Form Created', 'Awaiting Approval'];
    if (!quotableStatuses.includes(project.paymentStatus)) {
      return res.status(400).json({ success: false, message: `Project in non-quotable state: ${project.paymentStatus}` });
    }

    project.quotedAmount = amount;
    project.baseAmount = baseAmount || amount;
    project.gst = gst || 0;
    project.taxHandling = taxHandling || '';
    project.projectProgress = projectProgress || '';
    project.memberCost = memberCost || 0;
    project.discount = discount || 0;

    // Sync with paymentDetails if form already created
    if (project.paymentDetails) {
      project.paymentDetails.amount = amount;
    }

    const isUpdate = project.paymentStatus !== 'Pending';
    if (!isUpdate) {
      project.paymentStatus = 'Quote Sent';
    }
    await project.save();
    await project.logActivity(`${isUpdate ? 'Quote updated' : 'Quote sent'}: $${amount} fixed by SalesManager`, req.user.id, { paymentStatus: project.paymentStatus });
    await project.populate('userId', 'name email uniqueId');
    // Emit notification if socket available
    const io = req.app.get('io');
    if (io) {
      const room = `project_${project._id}`;
      io.to(room).emit('quoteSent', { amount, projectId: id });
    }
    console.log(`[${new Date().toISOString()}] Quote sent successfully for ${project.uniqueId} by ${req.user.id}`);
    res.status(200).json({
      success: true,
      data: { project, quotedAmount: amount },
      message: 'Quote sent successfully - create payment form next'
    });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error quoting amount:`, error);
    res.status(500).json({ success: false, message: 'Server error quoting amount' });
  }
};
// UPDATED: Create Payment Form by SalesManager (after Quote Sent) - renamed and restricted to SalesManager (ENHANCED: Added logging)
const createPaymentForm = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, projectDescription, detailedQuotation, dueDate } = req.body;
    console.log(`[${new Date().toISOString()}] Payment form attempt for ${id} by user ${req.user.id} (role: ${req.user.role}, dept: ${req.user.department})`);
    if (!checkIsSalesManager(req.user)) {
      const normalizedDept = (req.user.department || '').trim().toLowerCase().replace(/&/g, 'and');
      console.warn(`[${new Date().toISOString()}] Payment form denied: User ${req.user.id} role=${req.user.role}, normalized dept="${normalizedDept}"`);
      return res.status(403).json({ success: false, message: 'Access denied - SalesManager only' });
    }
    if (!title || !projectDescription || !detailedQuotation || !dueDate || isNaN(Date.parse(dueDate))) {
      return res.status(400).json({ success: false, message: 'Title, project description, detailed quotation, and valid due date are required' });
    }
    const projectQuery = buildProjectQuery(id);
    const project = await Project.findOne({ ...projectQuery, paymentStatus: 'Quote Sent' });
    if (!project || !project.quotedAmount) {
      return res.status(404).json({ success: false, message: 'Eligible project not found (must be Quoted)' });
    }
    // Default dueDate to 10 days if not provided (as per requirement)
    const finalDueDate = new Date(dueDate);
    if (isNaN(finalDueDate.getTime())) {
      finalDueDate.setDate(finalDueDate.getDate() + 10); // 10 days from now
    }

    // Include Professional Fee in Total Amount
    const professionalFee = project.professionalFee?.amount || 0;
    const totalAmount = (project.quotedAmount || 0) + professionalFee;

    // Append Fee details to quotation if present
    let finalDetailedQuotation = detailedQuotation;
    if (professionalFee > 0) {
      finalDetailedQuotation += `\nProfessional Fee (${project.professionalFee.vendorName || 'Vendor'}): ₹${professionalFee}`;
    }

    project.paymentDetails = {
      title,
      projectDescription,
      detailedQuotation: finalDetailedQuotation,
      dueDate: finalDueDate,
      amount: totalAmount,
      paidAmount: 0,
      paymentMethod: null,
      userSubmittedAt: null,
      salesApprovedAt: null,
      approvedBy: null,
    };
    project.paymentStatus = 'Payment Form Created';
    await project.save();
    await project.logActivity(`Payment form created by SalesManager with due date ${finalDueDate.toISOString().split('T')[0]}`, req.user.id, { paymentStatus: 'Payment Form Created' });
    await project.populate('userId', 'name email uniqueId');
    // Emit notification to owner
    const io = req.app.get('io');
    if (io) {
      const room = `project_${project._id}`;
      io.to(room).emit('paymentFormCreatedBySales', { projectId: id, paymentDetails: project.paymentDetails });
    }
    console.log(`[${new Date().toISOString()}] Payment form created for ${project.uniqueId}`);
    res.status(200).json({
      success: true,
      data: { project, paymentDetails: project.paymentDetails },
      message: 'Payment form created successfully - awaiting payment from owner'
    });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error creating payment form:`, error);
    res.status(500).json({ success: false, message: 'Server error creating payment form' });
  }
};
// REMOVED: setPaymentDetails (now handled by SalesManager via createPaymentForm)
// UPDATED: Submit Payment by project owner (select method + fullPayment option) - now after SalesManager creates form
const submitPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const { paymentMethod, checkNumber, bankName, checkDate, upiId, fullPayment = false } = req.body;
    if (!['Cash', 'Check', 'UPI'].includes(paymentMethod)) {
      return res.status(400).json({ success: false, message: 'Invalid payment method (Cash, Check, or UPI required)' });
    }
    // Validate additional fields
    if (paymentMethod === 'Check' && (!checkNumber || !bankName || !checkDate || isNaN(Date.parse(checkDate)))) {
      return res.status(400).json({ success: false, message: 'All check details (number, bank, valid date) required' });
    }
    if (paymentMethod === 'UPI' && !upiId) {
      return res.status(400).json({ success: false, message: 'UPI ID required' });
    }
    const projectQuery = buildProjectQuery(id);
    const project = await Project.findOne({ ...projectQuery, userId: req.user.id, paymentStatus: 'Payment Form Created' });
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found or payment form not ready' });
    }
    if (!project.paymentDetails) {
      return res.status(400).json({ success: false, message: 'Payment form not created by SalesManager yet' });
    }
    const totalAmount = project.paymentDetails.amount;
    const paidPercentage = fullPayment ? 1 : 0.5;
    const paidAmount = totalAmount * paidPercentage;
    project.paymentDetails.paidAmount = paidAmount; // Set paid amount
    project.paymentDetails.paymentMethod = paymentMethod;
    if (paymentMethod === 'Check') {
      project.paymentDetails.checkNumber = checkNumber;
      project.paymentDetails.bankName = bankName;
      project.paymentDetails.checkDate = new Date(checkDate);
    } else if (paymentMethod === 'UPI') {
      project.paymentDetails.upiId = upiId;
    }
    project.paymentDetails.userSubmittedAt = new Date();
    let newStatus, activityMsg, emitData;
    if (paymentMethod === 'UPI') {
      // UPI instant confirmation
      newStatus = fullPayment ? 'Full Paid' : '50% Paid';
      activityMsg = `${fullPayment ? 'Full' : '50%'} payment submitted via UPI by project owner`;
      emitData = { projectId: id, amount: paidAmount, method: paymentMethod, fullPayment };
      project.paidAt = new Date();
    } else {
      // Cash/Check await approval
      newStatus = 'Awaiting Approval';
      activityMsg = `Payment submitted via ${paymentMethod} (${fullPayment ? 'Full' : '50%'} amount) - awaiting SalesManager approval`;
      emitData = { projectId: id, amount: paidAmount, method: paymentMethod, fullPayment };
    }
    project.paymentStatus = newStatus;

    await project.save();
    await project.logActivity(activityMsg, req.user.id, { paymentStatus: newStatus });
    // Emit to SalesManager
    const io = req.app.get('io');
    if (io) {
      io.emit('paymentSubmittedByUser', emitData);
    }

    // NEW: Notify in Chat
    try {
      const projectGroup = await Conversation.findOne({ relatedId: project._id, type: 'project' });
      if (projectGroup) {
        const chatMsg = new Message({
          conversationId: projectGroup._id,
          senderId: req.user.id,
          content: activityMsg,
          contentType: 'system',
          isSystemMessage: true
        });
        await chatMsg.save();
        projectGroup.lastMessage = chatMsg._id;
        projectGroup.lastMessageAt = new Date();
        await projectGroup.save();
        if (io) {
          io.to(`conversation_${projectGroup._id}`).emit('newMessage', chatMsg);
          io.to(`user_${project.userId._id || project.userId}`).emit('newMessage', { message: chatMsg, projectId: project._id });
        }
      }
    } catch (chatError) {
      console.error(`[${new Date().toISOString()}] Failed to update project chat on submitPayment:`, chatError);
    }

    await project.populate('userId', 'name email uniqueId');
    res.status(200).json({
      success: true,
      data: { project, paymentDetails: project.paymentDetails },
      message: paymentMethod === 'UPI'
        ? `${fullPayment ? 'Full' : '50%'} payment confirmed via UPI - awaiting receipt`
        : `Payment submitted - awaiting SalesManager approval`
    });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error submitting payment:`, error);
    res.status(500).json({ success: false, message: 'Server error submitting payment' });
  }
};
// NEW: Submit Balance Payment by project owner (after 50% paid and receipt issued; fullPayment for remaining)
const submitBalancePayment = async (req, res) => {
  try {
    const { id } = req.params;
    const { paymentMethod, checkNumber, bankName, checkDate, upiId } = req.body; // No fullPayment - always full for balance
    if (!['Cash', 'Check', 'UPI'].includes(paymentMethod)) {
      return res.status(400).json({ success: false, message: 'Invalid payment method (Cash, Check, or UPI required)' });
    }
    // Validate additional fields
    if (paymentMethod === 'Check' && (!checkNumber || !bankName || !checkDate || isNaN(Date.parse(checkDate)))) {
      return res.status(400).json({ success: false, message: 'All check details (number, bank, valid date) required' });
    }
    if (paymentMethod === 'UPI' && !upiId) {
      return res.status(400).json({ success: false, message: 'UPI ID required' });
    }
    const projectQuery = buildProjectQuery(id);
    const project = await Project.findOne({ ...projectQuery, userId: req.user.id, paymentStatus: 'Official Receipt Issued' });
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found or balance payment not due' });
    }
    if (!project.paymentDetails || project.paymentDetails.paidAmount >= project.paymentDetails.amount) {
      return res.status(400).json({ success: false, message: 'No balance due or payment already full' });
    }
    const totalAmount = project.paymentDetails.amount;
    const remainingAmount = totalAmount - project.paymentDetails.paidAmount;
    project.paymentDetails.paidAmount += remainingAmount; // Add remaining to paid
    project.paymentDetails.paymentMethod = paymentMethod; // Override for balance (or append if needed)
    if (paymentMethod === 'Check') {
      project.paymentDetails.checkNumber = checkNumber;
      project.paymentDetails.bankName = bankName;
      project.paymentDetails.checkDate = new Date(checkDate);
    } else if (paymentMethod === 'UPI') {
      project.paymentDetails.upiId = upiId;
    }
    project.paymentDetails.userSubmittedAt = new Date(); // Reuse for balance
    let newStatus, activityMsg, emitData;
    if (paymentMethod === 'UPI') {
      // UPI instant
      newStatus = 'Full Paid';
      activityMsg = `Balance payment ($${remainingAmount.toFixed(2)}) submitted via UPI by project owner`;
      emitData = { projectId: id, amount: remainingAmount, method: paymentMethod, isBalance: true };
      project.paidAt = new Date();
    } else {
      // Await approval
      newStatus = 'Awaiting Balance Approval';
      activityMsg = `Balance payment submitted via ${paymentMethod} ($${remainingAmount.toFixed(2)}) - awaiting SalesManager approval`;
      emitData = { projectId: id, amount: remainingAmount, method: paymentMethod, isBalance: true };
    }
    project.paymentStatus = newStatus;

    await project.save();
    await project.logActivity(activityMsg, req.user.id, { paymentStatus: newStatus });
    // Emit to SalesManager
    const io = req.app.get('io');
    if (io) {
      io.emit('balancePaymentSubmitted', emitData);
    }

    // NEW: Notify in Chat
    try {
      const projectGroup = await Conversation.findOne({ relatedId: project._id, type: 'project' });
      if (projectGroup) {
        const chatMsg = new Message({
          conversationId: projectGroup._id,
          senderId: req.user.id,
          content: activityMsg,
          contentType: 'system',
          isSystemMessage: true
        });
        await chatMsg.save();
        projectGroup.lastMessage = chatMsg._id;
        projectGroup.lastMessageAt = new Date();
        await projectGroup.save();
        if (io) {
          io.to(`conversation_${projectGroup._id}`).emit('newMessage', chatMsg);
          io.to(`user_${project.userId._id || project.userId}`).emit('newMessage', { message: chatMsg, projectId: project._id });
        }
      }
    } catch (chatError) {
      console.error(`[${new Date().toISOString()}] Failed to update project chat on submitBalancePayment:`, chatError);
    }

    await project.populate('userId', 'name email uniqueId');
    res.status(200).json({
      success: true,
      data: { project, paymentDetails: project.paymentDetails },
      message: paymentMethod === 'UPI'
        ? `Balance payment confirmed via UPI - awaiting final receipt`
        : 'Balance payment submitted - awaiting SalesManager approval'
    });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error submitting balance payment:`, error);
    if (error.name === 'ValidationError') {
      const validationErrors = Object.entries(error.errors).map(([field, err]) => ({
        field,
        message: err.message
      }));
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validationErrors
      });
    }
    res.status(500).json({ success: false, message: 'Server error submitting balance payment' });
  }
};
// UPDATED: Approve Payment by SalesManager (for Cash/Check) - now handles fullPayment and balance (ENHANCED: Added logging)
const approvePayment = async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`[${new Date().toISOString()}] Approve payment attempt for ${id} by user ${req.user.id} (role: ${req.user.role}, dept: ${req.user.department})`);
    if (!checkIsSalesManager(req.user)) {
      const normalizedDept = (req.user.department || '').trim().toLowerCase().replace(/&/g, 'and');
      console.warn(`[${new Date().toISOString()}] Approve payment denied: User ${req.user.id} role=${req.user.role}, normalized dept="${normalizedDept}"`);
      return res.status(403).json({ success: false, message: 'Access denied - SalesManager only' });
    }
    const projectQuery = buildProjectQuery(id);

    // FIXED: First find project regardless of status to provide better error messages
    const projectAny = await Project.findOne(projectQuery);
    if (!projectAny) {
      console.error(`[${new Date().toISOString()}] Project not found with ID: ${id}`);
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    // Log the actual status for debugging
    console.log(`[${new Date().toISOString()}] Found project ${projectAny.uniqueId} with paymentStatus: ${projectAny.paymentStatus}`);

    // Check if status is correct (FIXED: Added 'Payment Submitted' to acceptable statuses)
    const validStatuses = ['Payment Submitted', 'Awaiting Approval', 'Awaiting Balance Approval'];
    if (!validStatuses.includes(projectAny.paymentStatus)) {
      console.warn(`[${new Date().toISOString()}] Cannot approve - project ${id} has status: ${projectAny.paymentStatus}`);
      return res.status(400).json({
        success: false,
        message: `Project is not awaiting approval. Current status: ${projectAny.paymentStatus}`
      });
    }

    const project = projectAny; // Use the found project
    // FIXED: Add explicit check for paymentDetails and method presence/validity (prevents undefined method issues)
    if (!project.paymentDetails || !project.paymentDetails.paymentMethod) {
      console.warn(`[${new Date().toISOString()}] Incomplete payment details for project ${id}: no paymentMethod`);
      return res.status(400).json({ success: false, message: 'Payment details incomplete - cannot approve' });
    }
    const method = project.paymentDetails.paymentMethod.trim();
    if (!['Cash', 'Check'].includes(method)) {
      console.warn(`[${new Date().toISOString()}] Invalid method for approval on ${id}: "${method}"`);
      return res.status(400).json({ success: false, message: 'Approval only required for Cash or Check' });
    }
    // Determine if full or balance
    const isBalance = project.paymentStatus === 'Awaiting Balance Approval';
    const totalAmount = project.paymentDetails.amount;
    const currentPaid = project.paymentDetails.paidAmount;
    const isFullPayment = currentPaid >= totalAmount;
    const newStatus = isFullPayment ? 'Full Paid' : '50% Paid';
    const paymentType = isFullPayment ? 'Full' : 'Partial';
    project.paymentDetails.approvedBy = req.user.id;
    project.paymentDetails.salesApprovedAt = new Date();
    project.paymentStatus = newStatus;
    project.paidAt = new Date();

    // AUTOMATIC RECEIPT GENERATION UPON APPROVAL
    const totalAmountGen = project.paymentDetails.amount;
    const paidAmountGen = project.paymentDetails.paidAmount || totalAmountGen * 0.5;
    const remainingAmountGen = totalAmountGen - paidAmountGen;
    const isFullPaidGen = remainingAmountGen === 0;

    const receiptData = {
      receiptId: `REC${Date.now()}`,
      projectUniqueId: project.uniqueId,
      userDetails: {
        name: project.userId.name,
        email: project.userId.email,
        uniqueId: project.userId.uniqueId,
        phone: project.userId.phone || 'N/A',
        branch: project.userId.branch || 'N/A',
        address: project.formData?.address || 'N/A',
        gstin: project.formData?.gstin || 'N/A',
      },
      amount: totalAmountGen,
      paidAmount: paidAmountGen,
      remainingAmount: remainingAmountGen,
      baseAmount: project.baseAmount || 0,
      gst: project.gst || 0,
      taxHandling: project.taxHandling || 'Excluded',
      professionalFee: project.professionalFee,
      memberCost: project.memberCost || 0,
      projectDetails: {
        title: project.paymentDetails.title,
        description: project.paymentDetails.projectDescription,
        quotation: project.paymentDetails.detailedQuotation,
        department: project.department,
        paymentMethod: project.paymentDetails.paymentMethod,
        approval: {
          approvedBy: req.user.name || 'SalesManager',
          approvedAt: new Date(),
        }
      },
      dueDate: project.paymentDetails.dueDate ? new Date(project.paymentDetails.dueDate).toISOString().split('T')[0] : new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      issuedAt: new Date().toISOString(),
      issuedBy: req.user.name,
      isBalanceReceipt: !isFullPaidGen,
    };
    project.receipt = { data: receiptData, generatedAt: new Date() };
    project.markModified('receipt.data');
    if (isFullPaidGen) {
      project.paymentStatus = 'Full Paid';
    } else {
      project.paymentStatus = 'Official Receipt Issued';
    }

    await project.save();
    await project.logActivity(`${paymentType} ${isBalance ? 'balance ' : ''}payment approved and ${isFullPaidGen ? 'BILL' : 'RECEIPT'} generated by SalesManager`, req.user.id, { paymentStatus: project.paymentStatus });
    // Emit to user
    const io = req.app.get('io');
    if (io) {
      const room = `project_${project._id}`;
      io.to(room).emit('paymentApproved', {
        projectId: id,
        amount: currentPaid,
        method,
        fullPayment: isFullPayment,
        isBalance
      });
    }

    // NEW: Notify in Chat
    try {
      const projectGroup = await Conversation.findOne({ relatedId: project._id, type: 'project' });
      if (projectGroup) {
        const chatMsg = new Message({
          conversationId: projectGroup._id,
          senderId: req.user.id,
          content: `${paymentType} ${isBalance ? 'balance ' : ''}payment approved via ${method} by SalesManager.`,
          contentType: 'system',
          isSystemMessage: true
        });
        await chatMsg.save();
        projectGroup.lastMessage = chatMsg._id;
        projectGroup.lastMessageAt = new Date();
        await projectGroup.save();
        if (io) {
          io.to(`conversation_${projectGroup._id}`).emit('newMessage', chatMsg);
          io.to(`user_${project.userId._id || project.userId}`).emit('newMessage', { message: chatMsg, projectId: project._id });
        }
      }
    } catch (chatError) {
      console.error(`[${new Date().toISOString()}] Failed to update project chat on approvePayment:`, chatError);
    }

    console.log(`[${new Date().toISOString()}] Payment approved for ${project.uniqueId} (${newStatus})`);
    await project.populate('userId', 'name email uniqueId');
    res.status(200).json({
      success: true,
      data: project,
      message: `${paymentType} ${isBalance ? 'balance ' : ''}payment approved - ${isFullPayment ? 'awaiting final receipt' : 'awaiting partial receipt'}`
    });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error approving payment:`, error);
    res.status(500).json({ success: false, message: 'Server error approving payment' });
  }
};
// UPDATED: Generate receipt by SalesManager (dynamic paidAmount/remaining; handles full payment; now for partial or final)
// UPDATED: Generate receipt by SalesManager (dynamic paidAmount/remaining; handles full payment; FIXED: Structure to match frontend - paidAmount/remainingAmount at root; dueDate as ISO string; Enhanced logging; now checks dueDate for balance) (ENHANCED: Added logging)
const generateReceipt = async (req, res) => {
  try {
    const { id } = req.params;
    const { dueDateOverride } = req.body; // Optional override
    const userRole = (req.user.role || '').toLowerCase();
    if (!checkIsSalesManager(req.user) && userRole !== 'admin' && userRole !== 'superadmin') {
      const normalizedDept = (req.user.department || '').trim().toLowerCase().replace(/&/g, 'and');
      console.warn(`[${new Date().toISOString()}] Receipt gen denied: User ${req.user.id} role=${req.user.role}, normalized dept="${normalizedDept}"`);
      return res.status(403).json({ success: false, message: 'Access denied - SalesManager only' });
    }
    const projectQuery = buildProjectQuery(id);
    const project = await Project.findOne({ ...projectQuery, paymentStatus: { $in: ['Payment Form Created', '50% Paid', 'Full Paid', 'Awaiting Balance Approval', 'Official Receipt Issued'] } })
      .populate('userId', 'name email uniqueId phone branch')
      .populate('paymentDetails.approvedBy', 'name email'); // FIXED: Populate nested ref path

    if (!project || !project.paymentDetails) {
      console.error(`[${new Date().toISOString()}] Receipt gen failed: No project or paymentDetails for ID ${id}`);
      return res.status(404).json({ success: false, message: 'Project not found, payment not confirmed, or no payment details' });
    }

    // CRITICAL: If a receipt already exists, DON'T overwrite it.
    // This preserves manager's custom modifications (items, descriptions, etc.)
    if (project.receipt && project.receipt.data) {
      console.log(`[${new Date().toISOString()}] Receipt already exists for ${project.uniqueId}, skipping generation to preserve modifications.`);
      return res.status(200).json({
        success: true,
        data: { project, receipt: project.receipt },
        message: 'Existing receipt preserved'
      });
    }

    // FIXED: Default dueDate if unset (10 days for balance)
    let finalDueDate = project.paymentDetails.dueDate;
    if (!finalDueDate) {
      finalDueDate = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000); // 10 days
      project.paymentDetails.dueDate = finalDueDate;
      await project.save();
      console.log(`[${new Date().toISOString()}] Defaulted dueDate to ${finalDueDate} for project ${project.uniqueId}`);
    }
    // NEW: Override if provided
    if (dueDateOverride && !isNaN(Date.parse(dueDateOverride))) {
      finalDueDate = new Date(dueDateOverride);
      project.paymentDetails.dueDate = finalDueDate;
      await project.save();
      console.log(`[${new Date().toISOString()}] Overrode dueDate to ${finalDueDate} for project ${project.uniqueId}`);
    }
    // Check if balance overdue (for logging)
    const isBalanceOverdue = project.paymentDetails.paidAmount < project.paymentDetails.amount && new Date() > finalDueDate;
    if (isBalanceOverdue) {
      await project.logActivity('Warning: Balance payment overdue', req.user.id, { overdue: true });
    }
    const totalAmount = project.paymentDetails.amount;
    const paidAmount = project.paymentDetails.paidAmount || totalAmount * 0.5;
    const remainingAmount = totalAmount - paidAmount;
    const isFullPaid = remainingAmount === 0;
    const receiptData = {
      receiptId: `REC${Date.now()}`, // Simple ID
      projectUniqueId: project.uniqueId,
      userDetails: {
        name: project.userId.name,
        email: project.userId.email,
        uniqueId: project.userId.uniqueId,
        phone: project.userId.phone || 'N/A',
        branch: project.userId.branch || 'N/A',
        address: project.formData?.address || 'N/A',
        gstin: project.formData?.gstin || 'N/A',
      },
      // FIXED: Moved amount/paidAmount/remainingAmount to root
      amount: totalAmount,
      paidAmount,
      remainingAmount,

      // Financial breakdown
      baseAmount: project.baseAmount || 0,
      gst: project.gst || 0,
      taxHandling: project.taxHandling || 'Excluded',
      professionalFee: project.professionalFee,
      memberCost: project.memberCost || 0,

      // projectDetails without amounts
      projectDetails: {
        title: project.paymentDetails.title,
        description: project.paymentDetails.projectDescription,
        quotation: project.paymentDetails.detailedQuotation,
        department: project.department,
        paymentMethod: project.paymentDetails.paymentMethod,
        // NEW: Approval details
        approval: project.paymentDetails.salesApprovedAt ? {
          approvedBy: project.paymentDetails.approvedBy?.name || 'SalesManager',
          approvedAt: project.paymentDetails.salesApprovedAt,
        } : null,
        // NEW: Overdue warning for balance
        overdueWarning: isBalanceOverdue ? 'Balance payment overdue - please pay within due date' : null,
      },
      // FIXED: Serialize dueDate
      dueDate: finalDueDate.toISOString().split('T')[0],
      issuedAt: new Date().toISOString(),
      issuedBy: req.user.name,
      isBalanceReceipt: !isFullPaid, // Flag for partial
    };
    project.receipt = { data: receiptData, generatedAt: new Date() };
    project.markModified('receipt.data');

    // Only update status if it's already one of the paid/approval states
    if (['50% Paid', 'Full Paid', 'Awaiting Balance Approval', 'Official Receipt Issued'].includes(project.paymentStatus)) {
      project.paymentStatus = isFullPaid ? 'Full Paid' : 'Official Receipt Issued';
    }

    await project.save();
    const paymentType = isFullPaid ? 'Full' : 'Partial';
    await project.logActivity(`${paymentType} receipt generated with due date ${finalDueDate.toISOString().split('T')[0]} by SalesManager ${isBalanceOverdue ? '(overdue balance noted)' : ''}`, req.user.id, { paymentStatus: project.paymentStatus });
    // Emit to user
    // Emit to user
    const io = req.app.get('io');
    if (io) {
      const room = `project_${project._id}`;
      io.to(room).emit('receiptGenerated', { receipt: { data: receiptData }, projectId: id });
    }

    // Define assignment message
    const assignmentMsg = isFullPaid ? ' - Ready for assignment' : '';

    console.log(`[${new Date().toISOString()}] Receipt generated for project ${project.uniqueId} (paid: $${paidAmount}, remaining: $${remainingAmount}, due: ${finalDueDate.toISOString().split('T')[0]})`);
    res.status(200).json({
      success: true,
      data: { project, receipt: { data: receiptData } },
      message: `Receipt generated successfully (${paymentType} payment)${isBalanceOverdue ? ' - Balance overdue noted' : ''}${assignmentMsg}`
    });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error generating receipt for ID %s:`, req.params.id, error);
    res.status(500).json({ success: false, message: 'Server error generating receipt' });
  }
};

// Update receipt data (SalesManager can edit receipt items after generation)
const updateReceipt = async (req, res) => {
  try {
    const { id } = req.params;
    const userRole = (req.user.role || '').toLowerCase();
    if (!checkIsSalesManager(req.user) && userRole !== 'admin' && userRole !== 'superadmin') {
      return res.status(403).json({ success: false, message: 'Access denied - Manager access required for this department' });
    }
    const projectQuery = buildProjectQuery(id);
    const project = await Project.findOne(projectQuery);
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });
    if (!project.receipt || !project.receipt.data) {
      return res.status(400).json({ success: false, message: 'No receipt exists to update. Generate a receipt first.' });
    }
    const updatedReceiptData = req.body; // Full ReceiptData object from frontend
    project.receipt = {
      data: { ...project.receipt.data, ...updatedReceiptData },
      generatedAt: project.receipt.generatedAt, // preserve original date
      updatedAt: new Date()
    };
    project.markModified('receipt.data');
    await project.save();
    await project.logActivity('Receipt data updated by SalesManager', req.user.id, {});
    res.status(200).json({ success: true, message: 'Receipt updated successfully', data: project.receipt });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error updating receipt:`, error);
    res.status(500).json({ success: false, message: 'Server error updating receipt' });
  }
};


// Assign project to department manager (SalesManager - updated: Require 'Official Receipt Issued' or 'Full Paid' status; ID fix) (ENHANCED: Added logging)
// Assign project to department manager (SalesManager - updated: Dynamic service matching)
const assignProjectToDepartmentManager = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { department, managerId } = req.body;
    console.log(`[${new Date().toISOString()}] Assign attempt for ${projectId} by user ${req.user.id} (role: ${req.user.role}, dept: ${req.user.department})`);
    const userRole = (req.user.role || '').toLowerCase();
    if (!checkIsSalesManager(req.user) && userRole !== 'admin' && userRole !== 'superadmin') {
      const normalizedDept = (req.user.department || '').trim().toLowerCase().replace(/&/g, 'and');
      console.warn(`[${new Date().toISOString()}] Assign denied: User ${req.user.id} role=${req.user.role}, normalized dept="${normalizedDept}"`);
      return res.status(403).json({ success: false, message: 'Access denied - SalesManager only' });
    }
    if (!department) {
      return res.status(400).json({ success: false, message: 'Department is required for assignment' });
    }
    const projectQuery = buildProjectQuery(projectId);
    const project = await Project.findOne({
      ...projectQuery,
      status: 'Submitted',
      paymentStatus: { $in: ['Official Receipt Issued', 'Full Paid', '50% Paid'] },
      $or: [{ assignedTo: { $exists: false } }, { assignedTo: { $size: 0 } }]
    });
    if (!project) {
      return res.status(404).json({ success: false, message: 'Eligible project not found (must be Submitted with receipt issued/full paid and unassigned)' });
    }
    if (project.department !== department) {
      return res.status(403).json({ success: false, message: `Cannot assign: Project department (${project.department}) does not match requested (${department})` });
    }

    // Dynamic manager finding based on project department
    // Normalize logic: "NGS" -> "ngs", "Biochemistry" -> "biochemistry"
    const normalize = (str) => (str || '').toLowerCase().trim().replace(/[-\s]+/g, '.*');
    const deptRegex = new RegExp(String(department).toLowerCase().trim().replace(/[-\s]+/g, '.*'), 'i');

    let managers = await User.find({
      role: 'manager',
      isActive: true,
      // Find managers whose service or department matches the project department
      $or: [
        { service: { $regex: deptRegex } },
        { department: { $regex: deptRegex } }
      ]
    }).select('_id name email reviewedAt').sort({ 'reviewedAt': 1 });

    if (managers.length === 0) {
      return res.status(400).json({ success: false, message: `No active managers found for ${department}` });
    }
    let assignedManager;
    if (managerId) {
      assignedManager = await User.findOne({
        _id: managerId,
        role: 'manager',
        isActive: true,
        $or: [
          { service: { $regex: deptRegex } },
          { department: { $regex: deptRegex } }
        ]
      });
      if (!assignedManager) {
        return res.status(400).json({ success: false, message: 'Specified manager not found or ineligible' });
      }
      assignedManager.reviewedAt = new Date();
      await assignedManager.save();
    } else {
      assignedManager = managers[0];
      managers[0].reviewedAt = new Date();
      await managers[0].save();
    }
    project.assignedTo = [assignedManager._id];
    project.status = 'Under Review';

    // NEW: Initialize Universal Workflow
    project.workflowStep = 1; // Step 1: Service Manager Review
    if (!project.approvals) project.approvals = {};
    project.approvals.serviceManager = { status: 'Pending' };
    project.approvals.financial = { status: 'Pending' };
    project.approvals.hr = { status: 'Pending' };

    await project.save();
    // AUTOMATION: Update Project Group Chat (add Manager)
    try {
      const projectGroup = await Conversation.findOne({ relatedId: project._id, type: 'project' });
      if (projectGroup) {
        const isMember = projectGroup.members.some(m => m.userId.toString() === assignedManager._id.toString());
        if (!isMember) {
          projectGroup.members.push({ userId: assignedManager._id, role: 'member' });
          await projectGroup.save();
          const assignMsg = new Message({
            conversationId: projectGroup._id,
            senderId: req.user.id,
            content: `Project assigned to ${assignedManager.name} (${department}).`,
            contentType: 'system',
            isSystemMessage: true
          });
          await assignMsg.save();
          projectGroup.lastMessage = assignMsg._id;
          projectGroup.lastMessageAt = new Date();
          await projectGroup.save();
          // Emit to conversation room (assumes client joins this room)
          const io = req.app.get('io');
          if (io) {
            io.to(`conversation_${projectGroup._id}`).emit('newMessage', assignMsg);
            io.to(`conversation_${projectGroup._id}`).emit('memberAdded', { conversationId: projectGroup._id, member: assignedManager });
          }
          console.log(`[${new Date().toISOString()}] Auto-added manager ${assignedManager.name} to project chat ${projectGroup._id}`);
        }
      } else {
        console.warn(`[${new Date().toISOString()}] Project Group not found for project ${project._id} during assignment`);
      }
    } catch (chatError) {
      console.error(`[${new Date().toISOString()}] Failed to update project chat on assignment:`, chatError);
    }
    await project.logActivity(
      `Project assigned to ${assignedManager.name} (${department} Manager) by SalesManager after payment`,
      req.user.id,
      { statusChange: 'Under Review' }
    );
    await project.populate('userId assignedTo', 'name email uniqueId department');
    console.log(`[${new Date().toISOString()}] Project ${project.uniqueId} assigned to ${assignedManager.name} in ${department}`);
    res.status(200).json({
      success: true,
      data: { project, assignedManager },
      message: `Project assigned to ${assignedManager.name} in ${department}`
    });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error assigning project:`, error.message);
    res.status(500).json({ success: false, message: 'Server error assigning project' });
  }
};
// Get unassigned Submitted projects (for SalesManager - unchanged, but now should find projects since create submits) (updated: Filter by paymentStatus)
const getUnassignedProjects = async (req, res) => {
  try {
    console.log(`!!! DEBUG: getUnassignedProjects HIT for user: ${req.user.id} !!!`);
    const { department } = req.query;
    console.log(`[${new Date().toISOString()}] Fetching unassigned projects for SalesManager: ${req.user.id} (dept: ${req.user.department}) | param dept: ${department || 'None'}`);
    const query = {
      status: 'Submitted',
      paymentStatus: { $in: ['Pending', 'Quote Sent', 'Payment Form Created', 'Payment Submitted', 'Awaiting Approval', '50% Paid', 'Official Receipt Issued', 'Full Paid'] }, // UPDATED: Include Full Paid
      $or: [{ assignedTo: { $exists: false } }, { assignedTo: { $size: 0 } }]
    };

    // Filter by department if provided (case-insensitive, handles space/hyphen difs)
    let filterDept = department;

    // Feature Request: "those have service as [service]... get in" - Automatic filter based on user service
    if (req.user.service && req.user.role === 'manager') {
      // Only auto-filter for service managers, not Sales managers (Sales managers see all if no filterDept provided)
      // But wait, getUnassignedProjects is for SALES MANAGERS usually?
      // The comment "Sales manager - unassigned projects" (router line 79)
      // If this is for Sales Manager, they might want to see all.
      // But if the user has a specific service (e.g. they are dual role?), this logic was here.
      // The original logic was: if (req.user.service...match(/drug.*discovery/i)) -> filterDept = 'Drug Discovery'
      // I will generalized this:
      const normalizeMap = {
        'ngs': 'NGS',
        'drugdiscovery': 'Drug Discovery',
        'softwaredevelopment': 'Software Development',
        'microbiology': 'Microbiology',
        'biochemistry': 'Biochemistry',
        'molecularbiology': 'Molecular Biology'
      };
      const userServiceNorm = req.user.service.toLowerCase().replace(/[^a-z]/g, '');
      for (const [key, val] of Object.entries(normalizeMap)) {
        if (userServiceNorm.includes(key)) {
          filterDept = val;
          console.log(`[${new Date().toISOString()}] Enforcing '${val}' filter based on manager service '${req.user.service}'`);
          break;
        }
      }
    }

    if (filterDept) {
      // Escape special chars except standard alphanumerics, then allow flexible separators
      const cleanDept = String(filterDept).trim().replace(/[-\s]+/g, '[-\\s]+');
      query.department = { $regex: new RegExp(cleanDept, 'i') };
    }
    console.log(`[${new Date().toISOString()}] Query:`, JSON.stringify(query, null, 2)); // Log exact query
    const rawProjects = await Project.find(query); // Raw find BEFORE populate
    console.log(`[${new Date().toISOString()}] Raw projects found:`, rawProjects.length, rawProjects.map(p => ({ _id: p._id, status: p.status, paymentStatus: p.paymentStatus, assignedTo: p.assignedTo }))); // Log IDs/status/assignedTo
    // Updated: Populate with role filter for 'user' and filter results
    const rawPopulatedProjects = await Project.find(query)
      .populate({
        path: 'userId',
        select: 'name email uniqueId department role'
      })
      .populate('activities.updatedBy', 'name role')
      .sort({ submittedAt: -1 });

    // Filter out projects where userId is null (orphaned)
    const projects = rawPopulatedProjects.filter(p => p.userId);

    console.log(`[${new Date().toISOString()}] After role filter (role='user'):`, projects.length);
    projects.forEach(project => {
      if (project.activities) {
        project.activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      }
    });
    projects.forEach(project => {
      if (project.category === 'New Project' && project.formData) {
        const config = departmentFormFields[project.department];
        if (config) {
          project.formSummary = {};
          config.requiredFields.slice(0, 3).forEach(field => {
            project.formSummary[field] = project.formData[field];
          });
        }
      }
    });
    console.log(`[${new Date().toISOString()}] Final projects count:`, projects.length);
    res.status(200).json({
      success: true,
      data: projects,
      count: projects.length
    });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error fetching unassigned projects:`, error.message, error.stack);
    res.status(500).json({ success: false, message: 'Server error fetching unassigned projects' });
  }
};
// UPDATED: getAssignedProjects (ENHANCED: Dynamic authorization based on user service/department)
const getAssignedProjects = async (req, res) => {
  try {
    console.log("!!! DEBUG: getAssignedProjects HIT !!!");
    console.log(`[${new Date().toISOString()}] Fetching assigned projects for manager: ${req.user.id} | service: ${req.user.service || 'N/A'} | department: ${req.user.department || 'N/A'}`);
    // Validate user ID to prevent CastError
    if (!mongoose.Types.ObjectId.isValid(req.user.id)) {
      console.error(`[${new Date().toISOString()}] Invalid ObjectId for user: ${req.user.id}`);
      return res.status(400).json({ success: false, message: 'Invalid user ID format' });
    }
    // Unified logic for different roles
    // TLs see all projects where they are Team Lead (no status restriction)
    // Managers and employees are still restricted to active statuses
    let query = {};

    if (req.user.role === 'employee') {
      // Employees see active and on-hold projects they are assigned to
      query.status = { $in: ['Under Review', 'In Progress', 'Completed', 'On Hold'] };
    } else if (req.user.role === 'manager') {
      // Managers see everything from Submission onwards
      query.status = { $in: ['Submitted', 'Under Review', 'In Progress', 'Completed', 'On Hold'] };
    } else if (req.user.role !== 'tl') {
      // Fallback for other non-TL roles
      query.status = { $in: ['Under Review', 'In Progress', 'Completed'] };
    }

    // Filter by Service/Department if user is not admin
    const isSales = checkIsSalesManager(req.user);
    if ((req.user.role === 'manager' || req.user.role === 'tl' || req.user.role === 'employee') && !isSales) {
      const userContext = req.user.service || req.user.department;
      if (userContext) {
        const normalize = (str) => (str || '').toLowerCase().trim().replace(/[-\s]+/g, '.*');
        const contextRegex = new RegExp(normalize(userContext), 'i');
        query.department = { $regex: contextRegex };
      }
    }

    // Allow manual department filter (e.g., from Sales or Admin)
    if (req.query.department && req.query.department !== 'All') {
      const normalize = (str) => (str || '').toLowerCase().trim().replace(/[-\s]+/g, '.*');
      const deptRegex = new RegExp(normalize(String(req.query.department)), 'i');
      query.department = { $regex: deptRegex };
    }

    if (req.user.role === 'manager') {
      // UPDATED: Service Manager only sees projects explicitly assigned to them
      // Sales Managers/Admins (isSales) see everything in their department context
      if (!isSales) {
        query.assignedTo = req.user.id;
      }
    } else if (req.user.role === 'tl') {
      // TL sees ALL projects assigned to them as Team Lead (any status)
      query.teamLeadId = req.user.id;
    } else if (req.user.role === 'employee') {
      // Employee sees projects they are part of
      query.teamMembers = req.user.id;
    } else {
      return res.status(403).json({ success: false, message: 'Access denied - Unauthorized role' });
    }

    const allProjects = await Project.find(query)
      .populate('userId reviewerId assignedTo teamLeadId teamMembers', 'name email uniqueId department phone branch role')
      .populate('financialReview.requestedBy', 'name email uniqueId role')
      .populate('activities.updatedBy', 'name role department service')
      .populate('messages.senderId', '_id name email uniqueId role department service')
      .populate('reports.submittedBy', 'name role department service') // NEW: Populate reports sender
      .sort({ submittedAt: -1 });

    const projects = allProjects.map(p => p.toObject());
    projects.forEach(project => {
      if (project.activities && Array.isArray(project.activities)) {
        // Filter: If user is manager, exclude activities from TLs of other services
        if (req.user.role === 'manager' && req.user.service) {
          const normalizedManagerService = normalizeService(req.user.service);
          project.activities = project.activities.filter(activity => {
            const actor = activity.updatedBy;
            if (actor && actor.role === 'tl') {
              const actorService = normalizeService(actor.service);
              if (actorService && actorService !== normalizedManagerService) {
                return false; // Hide activity from other service TL
              }
            }
            return true;
          });
        }
        project.activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      }
      if (project.messages && Array.isArray(project.messages)) {
        // Filter: If user is manager, exclude messages from TLs of other services
        if (req.user.role === 'manager' && req.user.service) {
          const normalizedManagerService = normalizeService(req.user.service);
          project.messages = project.messages.filter(msg => {
            const sender = msg.senderId;
            if (sender && sender.role === 'tl') {
              const senderService = normalizeService(sender.service);
              if (senderService && senderService !== normalizedManagerService) {
                return false; // Hide message from other service TL
              }
            }
            return true;
          });
        }
        project.messages.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      }
      // NEW: Filter Reports
      if (project.reports && Array.isArray(project.reports)) {
        if (req.user.role === 'manager' && req.user.service) {
          const normalizedManagerService = normalizeService(req.user.service);
          project.reports = project.reports.filter(report => {
            const reporter = report.submittedBy;
            if (reporter && reporter.role === 'tl') {
              const reporterService = normalizeService(reporter.service);
              if (reporterService && reporterService !== normalizedManagerService) {
                return false; // Hide report from other service TL
              }
            }
            return true;
          });
        }
      }
    });
    projects.forEach(project => {
      if (project.category === 'New Project' && project.formData) {
        const config = departmentFormFields[project.department];
        if (config) {
          project.formSummary = {};
          config.requiredFields.slice(0, 3).forEach(field => {
            project.formSummary[field] = project.formData[field];
          });
        }
      }
    });
    console.log(`[${new Date().toISOString()}] Fetched ${projects.length} projects for manager`);
    res.status(200).json({
      success: true,
      data: projects,
      count: projects.length
    });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error fetching assigned projects:`, error.message, error.stack);
    res.status(500).json({ success: false, message: 'Server error fetching assigned projects' });
  }
};
// Updated: getProject (updated query for SalesManager if needed - removed Draft handling; ENHANCED: Fuller owner details for managers; NEW: Populate messages)
const getProject = async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`[${new Date().toISOString()}] Fetching project: ${id} for user: ${req.user.id} (role: ${req.user.role})`);
    const projectQuery = buildProjectQuery(id);
    let query = { ...projectQuery };
    const isSales = checkIsSalesManager(req.user);
    const isFinancial = checkIsFinancialPersonnel(req.user);
    const userRole = (req.user.role || '').toLowerCase();
    if (isSales || isFinancial || userRole === 'admin' || userRole === 'superadmin') {
      // Sales Managers, Financial Personnel, and Admins can see any project
      // No extra query restrictions
    } else if (req.user.role === 'manager') {
      // UPDATED: Service Manager only sees projects explicitly assigned to them
      if (!isSales) {
        query.assignedTo = req.user.id;
      } else {
        // Sales Managers/Admins see their context
        const userContext = req.user.service || req.user.department;
        if (userContext) {
          const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const looseRegex = new RegExp(escapeRegex(userContext.trim()), 'i');
          query = {
            ...query,
            $or: [
              { assignedTo: req.user.id },
              { department: { $regex: looseRegex } }
            ]
          };
        } else {
          query = { ...query, assignedTo: req.user.id };
        }
      }
    } else if (req.user.role === 'tl') {
      query = { ...query, teamLeadId: req.user.id };
    } else if (req.user.role === 'employee') {
      query = { ...query, teamMembers: req.user.id, status: { $in: ['Under Review', 'In Progress', 'Completed', 'On Hold'] } };
    } else {
      query = { ...query, userId: req.user.id };
    }
    console.log(`[DEBUG] getProject Query:`, JSON.stringify(query, null, 2));
    if (req.user.role === 'manager') console.log(`[DEBUG] Manager Context: Service=${req.user.service}, Dept=${req.user.department}`);
    // Verify existence first (Debug)
    const exists = await Project.findOne(projectQuery);
    if (!exists) {
      console.log(`[${new Date().toISOString()}] Project ${id} not found in DB`);
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    const projectData = await Project.findOne(query)
      .populate('userId reviewerId assignedTo teamLeadId teamMembers', 'name email uniqueId department phone branch role')
      .populate('activities.updatedBy', 'name role department service')
      .populate('messages.senderId', '_id name email uniqueId role department service')
      .populate('reports.submittedBy', 'name role department service');

    if (!projectData || !projectData.userId) {
      console.warn(`[${new Date().toISOString()}] Project ${id} not found, access denied, or missing owner. Project exists: ${!!exists}`);
      return res.status(403).json({ success: false, message: 'Access denied: You are not authorized to view this project or it is incomplete.' });
    }

    const project = projectData.toObject();
    if (project.category === 'New Project') {
      project.fullFormData = project.formData;
    }

    // Filter activities, messages, and reports for Managers
    if (req.user.role === 'manager' && req.user.service) {
      const normalizedManagerService = normalizeService(req.user.service);

      if (project.activities) {
        project.activities = project.activities.filter(activity => {
          const actor = activity.updatedBy;
          if (actor && actor.role === 'tl') {
            const actorService = normalizeService(actor.service);
            if (actorService && actorService !== normalizedManagerService) return false;
          }
          return true;
        });
      }

      if (project.messages) {
        project.messages = project.messages.filter(msg => {
          const sender = msg.senderId;
          if (sender && sender.role === 'tl') {
            const senderService = normalizeService(sender.service);
            if (senderService && senderService !== normalizedManagerService) return false;
          }
          return true;
        });
      }

      if (project.reports) {
        project.reports = project.reports.filter(report => {
          const reporter = report.submittedBy;
          if (reporter && reporter.role === 'tl') {
            const reporterService = normalizeService(reporter.service);
            if (reporterService && reporterService !== normalizedManagerService) return false;
          }
          return true;
        });
      }
    }

    if (project.activities) {
      project.activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    }
    if (project.messages) { // NEW: Sort messages
      project.messages.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    }
    res.status(200).json({
      success: true,
      data: project,
      message: 'Project retrieved successfully'
    });
  } catch (error) {
    // Remove the CastError check (handled by query now)
    console.error(`[${new Date().toISOString()}] Error fetching project:`, error.message);
    res.status(500).json({ success: false, message: 'Server error fetching project' });
  }
};
// UPDATED: Get form config (ENHANCED: Include servicesOptions if present for frontend multi-select rendering; now includes conditionalFields)
const getFormConfig = async (req, res) => {
  try {
    const deptParam = typeof req.query.department === 'string' ? req.query.department : '';
    console.log(`[${new Date().toISOString()}] Fetching form config for: ${deptParam || 'unknown'}`);
    let department = deptParam.trim();
    if (!department) {
      // Fallback parsing from URL if not in query (legacy support)
      const url = req.originalUrl || req.url;
      const queryIndex = url.indexOf('?');
      if (queryIndex !== -1) {
        const queryStr = url.substring(queryIndex + 1);
        const params = require('querystring').parse(queryStr, '&', '=', { decodeURIComponent: true });
        department = params.department?.toString().trim();
      }
    }
    if (!department) {
      return res.status(400).json({ success: false, message: 'Department query parameter is required' });
    }
    // Robust matching: Try multiple variants to match department keys (handles 'NGS', 'ngs', 'Ngs', etc.)
    const originalDepartment = department;
    const titleCased = department.toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
    const upperCased = department.toUpperCase();
    const possibleDepartments = [
      originalDepartment,
      titleCased,
      upperCased
    ];
    let config;
    let matchedDepartment;
    for (const dept of possibleDepartments) {
      if (departmentFormFields[dept]) {
        config = departmentFormFields[dept];
        matchedDepartment = dept;
        break;
      }
    }
    if (!config) {
      config = departmentFormFields['IT']; // Fallback
      matchedDepartment = 'IT';
    }
    if (!config) {
      return res.status(404).json({ success: false, message: 'No form configuration for this department' });
    }
    // Prepare response data (use matchedDepartment for consistency)
    const responseData = {
      department: matchedDepartment, // Use the exact key matched
      requiredFields: config.requiredFields,
      fieldTypes: config.fieldTypes,
      // Include conditional fields
      conditionalFields: config.conditionalFields || {},
    };
    // Include servicesOptions if available (for multi-select)
    if (config.servicesOptions) {
      responseData.servicesOptions = config.servicesOptions;
    }
    res.status(200).json({
      success: true,
      data: responseData,
      message: 'Form configuration retrieved successfully'
    });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error fetching form config:`, error.message);
    res.status(500).json({ success: false, message: 'Server error fetching form config' });
  }
};
// Updated: startTask (ID fix)
// Updated: startTask (ID fix)
const startTask = async (req, res) => {
  try {
    const { id } = req.params;
    const { taskNotes } = req.body;
    const projectQuery = buildProjectQuery(id);

    const isGlobalAdmin = req.user.role === 'admin' || req.user.role === 'superadmin';
    let query = { ...projectQuery, status: 'Under Review' };

    if (isGlobalAdmin) {
      // Admin bypasses assignment checks
    } else if (req.user.role === 'manager') {
      query.assignedTo = { $in: [req.user.id] }; // assignedTo is an array
    } else if (req.user.role === 'tl') {
      query.teamLeadId = req.user.id;
    } else if (req.user.role === 'employee') {
      query.teamMembers = req.user.id;
    } else {
      // Fallback or deny
      return res.status(403).json({ success: false, message: 'Unauthorized role for action' });
    }

    const project = await Project.findOne(query);

    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found or access denied' });
    }
    project.status = 'In Progress';
    if (!project.reviewedAt) project.reviewedAt = new Date(); // Set if not set
    if (!project.reviewerId && req.user.role === 'manager') project.reviewerId = req.user.id; // Only manager sets reviewerId? Or anyone starting it?

    if (taskNotes) {
      project.remarks = taskNotes;
    }
    await project.save();

    const roleMap = { manager: 'Manager', tl: 'Team Lead', employee: 'Employee' };
    await project.logActivity(`Task started by ${roleMap[req.user.role] || req.user.name}`, req.user.id, {
      statusChange: 'In Progress',
      remarks: taskNotes
    });
    await project.populate('userId reviewerId', 'name email uniqueId');
    res.status(200).json({
      success: true,
      data: project,
      message: 'Task started successfully - project now in progress'
    });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error starting task:`, error.message);
    res.status(500).json({ success: false, message: 'Server error starting task' });
  }
};
// Update project progress (NEW: Allow employees to add progress notes while task is in progress)
const updateProgress = async (req, res) => {
  console.log(`[Project Debug] updateProgress called for project: ${req.params.id} by user: ${req.user.id} (${req.user.role})`);
  try {
    const { id } = req.params;
    const { progressNotes, progressTitle, progress } = req.body;

    if (!progressNotes || typeof progressNotes !== 'string' || progressNotes.trim().length < 5) {
      return res.status(400).json({
        success: false,
        message: 'Progress notes must be at least 5 characters'
      });
    }

    const project = await Project.findById(id);
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

    // Role-based access control
    let activityTitle = progressTitle || `Progress update by ${req.user.role}`;
    let visibility = 'Internal';

    const userRole = (req.user.role || '').toLowerCase();
    if (userRole === 'employee') {
      // Employee must be a team member
      const isMember = project.teamMembers && project.teamMembers.some(m => m.toString() === req.user.id.toString());
      if (!isMember) return res.status(403).json({ success: false, message: 'Access denied: not a team member' });
      visibility = 'Internal';
      activityTitle = `[Employee Update] ${activityTitle}`;
    } else if (userRole === 'tl') {
      // TL must be the assigned team lead
      if (!project.teamLeadId || project.teamLeadId.toString() !== req.user.id.toString()) {
        return res.status(403).json({ success: false, message: 'Access denied: not the assigned TL' });
      }
      visibility = 'TL_Reviewed';
      activityTitle = `[TL Update] ${activityTitle}`;
    } else if (userRole === 'manager' || userRole === 'admin' || userRole === 'superadmin') {
      // Manager must be in the assignedTo array, but skip this check for admin/superadmin
      const isAssigned = project.assignedTo && project.assignedTo.some(m => m.toString() === req.user.id.toString());
      const isGlobalAdmin = userRole === 'admin' || userRole === 'superadmin';

      if (!isAssigned && !isGlobalAdmin) {
        return res.status(403).json({ success: false, message: 'Access denied: project not assigned to you' });
      }
      visibility = 'External';
      activityTitle = `[${userRole === 'manager' ? 'Manager' : 'Admin'} Update] ${activityTitle}`;
    } else {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const attachments = req.files ? req.files.map(file => {
      const absolutePath = file.path.replace(/\\/g, '/');
      const relativePath = absolutePath.includes('uploads/')
        ? 'uploads/' + absolutePath.split('uploads/')[1]
        : absolutePath;

      return {
        path: relativePath,
        filename: file.originalname,
        mimetype: file.mimetype,
        size: file.size
      };
    }) : [];

    // Register in Drive if any
    if (attachments.length > 0) {
      console.log(`[Drive Debug] Registering ${attachments.length} attachments for project ${project._id}`);
      // If visibility is external, also register for the project owner (User)
      const targetUserId = (visibility === 'External' || req.user.role === 'manager') ? project.userId : null;
      console.log(`[Drive Debug] Target User for drive: ${targetUserId || 'None'}`);
      const driveRes = await registerFilesToDrive(req.user.id, req.files, 'Project Result', project._id, targetUserId);
      console.log(`[Drive Debug] Registered ${driveRes.length} records in Drive model`);

      // Removed: project.attachments = [...(project.attachments || []), ...attachments];
      // This ensures "Project Update Results" remain separate from "Attachments Files"
    }

    if (progress !== undefined) {
      project.projectProgress = String(progress);
      await project.save(); // Save progress field change
    }

    await project.logActivity(activityTitle, req.user.id, {
      remarks: progressNotes,
      visibility,
      attachments // NEW
    });

    res.status(200).json({
      success: true,
      data: project,
      message: 'Progress update recorded successfully'
    });
  } catch (error) {
    console.error('Error updating progress:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// NEW: Review and push progress up the hierarchy
const pushProgress = async (req, res) => {
  console.log(`[Project Debug] pushProgress called for project: ${req.params.id} activity: ${req.params.activityId} by user: ${req.user.id}`);
  try {
    const { id, activityId } = req.params;
    const { action, remarks } = req.body; // action: 'TL_Review', 'SM_Finalize'

    const project = await Project.findById(id);
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

    const activity = project.activities.id(activityId);
    if (!activity) return res.status(404).json({ success: false, message: 'Activity not found' });

    if (req.user.role === 'tl' && action === 'TL_Push') {
      activity.visibility = 'TL_Reviewed';
      activity.description = activity.description.replace('[Employee Update]', '[TL Reviewed]');
      await project.logActivity(`TL pushed progress to Service Manager`, req.user.id, { remarks });
    } else if (req.user.role === 'manager' && action === 'SM_Push') {
      activity.visibility = 'External';
      activity.description = activity.description.replace('[TL Reviewed]', '[Final Progress]').replace('[Employee Update]', '[Final Progress]');
      await project.logActivity(`Service Manager published progress to Client`, req.user.id, { remarks });

      // NEW: Register existing attachments to User Drive when pushed externally
      if (activity.attachments && activity.attachments.length > 0) {
        // We pass the activity.attachments as if they were req.files (they have similar properties)
        await registerFilesToDrive(project.userId, activity.attachments, 'Project Result', project._id);
      }
    } else {
      return res.status(403).json({ success: false, message: 'Unauthorized action for your role' });
    }

    activity.approvedBy = req.user.id;
    activity.approvedAt = new Date();
    if (remarks) activity.remarks = (activity.remarks || '') + `\n\nReview Notes: ${remarks}`;

    await project.save();
    res.status(200).json({ success: true, message: 'Progress pushed successfully', data: project });
  } catch (error) {
    console.error('Error pushing progress:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
// Complete project (UPDATED: Added typeof check to ensure completionNotes is string before trim/length) (updated ID fix)
// Complete project (UPDATED: Made completionNotes optional with default; added body presence check to avoid Content-Type issues; enhanced logging)
const completeProject = async (req, res) => {
  try {
    const { id } = req.params;
    const { completionNotes } = req.body;

    // NEW: Ensure body is parsed (tolerate empty body)
    if (!req.body) {
      req.body = {}; // Fallback for empty POST
    }

    // Validate completionNotes (now optional, but warn if missing)
    const notes = completionNotes && typeof completionNotes === 'string'
      ? completionNotes.trim()
      : 'Task completed without detailed notes (standard wrap-up).';

    if (notes.length < 10) {
      return res.status(400).json({
        success: false,
        message: 'Completion notes must be at least 10 characters (or provide details for better tracking).'
      });
    }

    const projectQuery = buildProjectQuery(id);
    const isGlobalAdmin = req.user.role === 'admin' || req.user.role === 'superadmin';
    let query = { ...projectQuery, status: 'In Progress' }; // Must be in progress to complete

    if (isGlobalAdmin) {
      // Admin bypasses assignment checks
    } else if (req.user.role === 'manager') {
      query.assignedTo = { $in: [req.user.id] }; // assignedTo is an array
    } else if (req.user.role === 'tl') {
      query.teamLeadId = req.user.id;
    } else if (req.user.role === 'employee') {
      query.teamMembers = req.user.id;
    } else {
      return res.status(403).json({ success: false, message: 'Unauthorized role for action' });
    }
    const project = await Project.findOne(query);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found or access denied' });
    }
    project.status = 'Completed';
    project.reviewerRemarks = notes; // Use provided or default
    await project.save();
    const roleMap = { manager: 'Manager', tl: 'Team Lead', employee: 'Employee' };
    await project.logActivity(`Project completed by ${roleMap[req.user.role] || req.user.name}: ${notes.substring(0, 100)}${notes.length > 100 ? '...' : ''}`, req.user.id, {
      statusChange: 'Completed',
      remarks: notes
    });
    await project.populate('userId reviewerId', 'name email uniqueId');
    console.log(`[${new Date().toISOString()}] Project ${project.uniqueId} completed by ${req.user.id} with notes: ${notes.substring(0, 50)}...`);
    res.status(200).json({
      success: true,
      data: project,
      message: 'Project completed successfully'
    });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error completing project:`, error.message);
    res.status(500).json({ success: false, message: 'Server error completing project' });
  }
};
// Controller/projectController.js (UPDATED: Changed 'services' to 'service' field in User query/filter to match DB schema; kept strict role 'manager' + fuzzy matching for 'drug-discovery')
// Controller/projectController.js (UPDATED: Hardcoded to 'drug-discovery' service; fetches and shows ONLY active managers with role 'manager' matching 'drug-discovery' variants via fuzzy normalization)
// Controller/projectController.js (UPDATED: Generic Service Manager Fetcher - Renamed internally but function name kept for export compatibility)
const getDrugDiscoveryManagers = async (req, res) => {
  const timestamp = new Date().toISOString();
  try {
    // GUARD: Check for req.user early
    if (!req.user) {
      console.warn(`[${timestamp}] No authenticated user - aborting managers fetch`);
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    // Determine requested service/department
    let requestedService = req.query.service || req.query.department;
    // Fallback to user's service if not provided
    if (!requestedService) {
      // If SalesManager, they might be asking generically, but typically this endpoint is used by assigning logic or by specific dashboards.
      // If route is /managers without params, and we are generic, we might need a param.
      // Assuming legacy fallback: if no query, try 'drug-discovery' default?
      // Better: use user's service if available.
      requestedService = req.user.service || 'drug-discovery';
    }

    console.log(`[${timestamp}] Fetch managers attempt for service "${requestedService}" by user ${req.user.id}`);

    // Flexible check to match frontend (role 'manager' + sales dept)
    const checkIsSalesManager = (user) => {
      if (!user) return false;
      const role = user.role?.toLowerCase();
      if (role === 'admin' || role === 'superadmin') return true;
      if (role !== 'manager') return false;
      const normalizedDept = (user.department || '').trim().toLowerCase().replace(/&/g, 'and');
      return normalizedDept.includes('sales') ||
        ['sales and customer services', 'sales and customer support'].includes(normalizedDept);
    };

    if (!checkIsSalesManager(req.user)) {
      const normalizedDept = (req.user.department || '').trim().toLowerCase().replace(/&/g, 'and');
      console.warn(`[${timestamp}] Managers fetch denied: User ${req.user.id} role="${req.user.role}", normalized dept="${normalizedDept}" (requires manager + sales dept)`);
      return res.status(403).json({ success: false, message: 'Access denied - Sales Manager role required' });
    }

    const normalizeService = (serviceStr) => (typeof serviceStr === 'string' ? serviceStr : String(serviceStr || '')).trim().toLowerCase()
      .replace(/\s+/g, ' ')
      .replace(/&/g, 'and')
      .replace(/-+/g, ' ');

    const queryServiceNormalized = normalizeService(requestedService);
    console.log(`[${timestamp}] Normalized query service: "${queryServiceNormalized}"`);

    // Create a flexible regex for the service
    const serviceRegex = new RegExp(queryServiceNormalized.split(' ').join('.*'), 'i');

    const potentialManagers = await User.find({
      role: 'manager',
      isActive: true,
      $or: [
        { service: { $regex: serviceRegex } },
        { department: { $regex: serviceRegex } }
      ]
    }).select('_id name email uniqueId branch reviewedAt service department');

    console.log(`[${timestamp}] Fetched ${potentialManagers.length} potential managers from DB for ${requestedService}`);

    // Show all found
    const responseManagers = potentialManagers.map(m => ({
      _id: m._id,
      name: m.name,
      email: m.email,
      uniqueId: m.uniqueId,
      branch: m.branch,
      reviewedAt: m.reviewedAt,
      service: m.service || m.department
    })).sort((a, b) => new Date(b.reviewedAt || 0).getTime() - new Date(a.reviewedAt || 0).getTime());

    res.status(200).json({
      success: true,
      data: responseManagers,
      message: `Managers retrieved for service ${requestedService}`
    });
  } catch (error) {
    console.error(`[${timestamp}] Error fetching managers:`, error);
    res.status(500).json({ success: false, message: 'Server error fetching managers' });
  }
};
/// UPDATED: Get sales manager activities (ENHANCED: Fixed filtering for non-populated updatedBy ObjectId fields using toString() comparison; added manager name mapping for assigner without relying on populate; converted query to use ObjectIds for safety; updated sample log to show string IDs; removed unused populate for activities.updatedBy since schema likely lacks 'ref'; now correctly captures previous assignments, history, and archive data)
const getSalesManagerActivities = async (req, res) => {
  try {
    const timestamp = new Date().toISOString();
    const queryLimit = typeof req.query.limit === 'string' ? req.query.limit : '0';
    const limit = parseInt(queryLimit) || 0; // 0 means full
    const activeOnly = req.query.activeOnly === 'true';
    const statusQuery = typeof req.query.status === 'string' ? req.query.status : '';
    const statusFilter = statusQuery ? statusQuery.split(',') : [];
    // Fetch all active Sales Managers in the department for shared history
    const salesManagers = await User.find({
      role: 'manager',
      department: req.user.department,
      isActive: true,
    }).select('_id name');
    if (salesManagers.length === 0) {
      console.warn(`[${new Date().toISOString()}] No active sales managers found for dept: ${req.user.department}`);
      return res.status(200).json({
        success: true,
        data: [],
        count: 0,
        total: 0,
        message: 'No sales manager activities available'
      });
    }
    const salesManagerIds = salesManagers.map(m => m._id.toString());
    // NEW: Create map for quick name lookup
    const managerMap = new Map(salesManagers.map(m => [m._id.toString(), m.name]));
    console.log(`[${new Date().toISOString()}] Sales Manager IDs for query: [${salesManagerIds.join(', ')}] (${salesManagerIds.length} total)`);
    // Convert to ObjectIds for safe query matching
    const salesManagerObjectIds = salesManagerIds.map(id => new mongoose.Types.ObjectId(id));
    // Base query for all projects with sales manager activities
    let query = {
      'activities.updatedBy': { $in: salesManagerObjectIds },
      department: { $ne: req.user.department } // Exclude own dept
    };
    // Apply optional filters
    if (activeOnly) {
      query.status = { $in: ['Submitted', 'Under Review'] };
    } else if (statusFilter.length > 0) {
      query.status = { $in: statusFilter };
    }
    // Default: No status filter = full history (including archive/Completed)
    // SEC-FIX: Do not log full query object if it may contain sensitive data
    console.log(`[${new Date().toISOString()}] Activities Query constructed (filters: activeOnly=${activeOnly}, statusFilterCount=${statusFilter.length})`);
    const projects = await Project.find(query)
      .populate('userId', 'name email uniqueId') // Keep userId populate
      // REMOVED: populate('activities.updatedBy', 'name role') - not needed with manual mapping
      .sort({ 'activities.0.timestamp': -1 }); // Sort by latest activity first
    // Log raw projects found (with key details)
    console.log(`[${new Date().toISOString()}] Raw Projects Found: ${projects.length}`);
    projects.slice(0, 5).forEach((project, idx) => { // Log first 5 to avoid spam
      const actCount = project.activities ? project.activities.length : 0;
      const matchingActs = project.activities ? project.activities.filter(act =>
        salesManagerIds.includes(act.updatedBy.toString())
      ).length : 0;
      console.log(` - Proj ${idx + 1} (${project._id}): Status=${project.status}, Dept=${project.department}, Total Acts=${actCount}, Matching Sales Acts=${matchingActs}`);
      if (matchingActs === 0 && actCount > 0 && idx < 2) { // Log sample activities if no match (first 2 projects)
        console.log(` Sample Acts:`, project.activities.slice(0, 2).map(act => ({
          desc: act.description?.substring(0, 50) + '...',
          statusChange: act.statusChange,
          timestamp: act.timestamp,
          updatedBy: act.updatedBy.toString() // FIXED: Log string ID for clarity
        })));
      }
    });
    // Extract and map activities (focus on assignment actions)
    const activities = [];
    let totalMatchingActs = 0;
    projects.forEach(project => {
      if (project.activities) {
        // FIXED: Filter using updatedBy.toString() since updatedBy is ObjectId (no populate)
        const salesManagerActs = project.activities.filter(activity =>
          salesManagerIds.includes(activity.updatedBy.toString())
        );
        totalMatchingActs += salesManagerActs.length;
        const assignmentActs = salesManagerActs.filter(activity =>
          activity.statusChange === 'Under Review' || activity.description.includes('assigned')
        );
        // Log per-project matching
        console.log(`[${new Date().toISOString()}] Proj ${project._id}: ${salesManagerActs.length} sales acts, ${assignmentActs.length} assignment acts`);
        assignmentActs
          .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
          .slice(0, 1) // Latest per project
          .forEach(activity => {
            let projectTitle = project.category || 'Untitled Project';
            if (project.formData && project.department) {
              const titleFields = {
                'Drug Discovery': 'compoundName',
                'NGS': 'sampleName',
                'Software Development': 'projectName',
                'Microbiology': 'sampleName',
                'Biochemistry and Molecular Biology': 'sampleName',
                'IT': 'projectName',
              };
              const preferredField = titleFields[project.department];
              if (preferredField && project.formData[preferredField]) {
                projectTitle = project.formData[preferredField];
              }
            }
            let assignedManager = null;
            if (activity.description.includes('assigned to')) {
              const match = activity.description.match(/assigned to (.+?) \(/);
              if (match) {
                assignedManager = match[1];
              }
            }
            activities.push({
              id: activity._id || `${project._id}-${activity.timestamp}`,
              description: activity.description,
              timestamp: activity.timestamp,
              projectTitle,
              projectUniqueId: project.uniqueId,
              department: project.department,
              status: project.status,
              assignedManager,
              // UPDATED: Use map for assigner name without populate
              assigner: managerMap.get(activity.updatedBy.toString()) || 'Sales Manager'
            });
          });
      }
    });
    // Log total matching activities before final filter/sort
    console.log(`[${new Date().toISOString()}] Total Sales Activities Across Projects: ${totalMatchingActs}, Extracted Assignment Activities: ${activities.length}`);
    // Sort all activities by timestamp descending
    activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    // Apply limit if specified
    const limitedActivities = limit > 0 ? activities.slice(0, limit) : activities;
    console.log(`[${new Date().toISOString()}] Found ${activities.length} sales manager activities (returning ${limitedActivities.length}) ${activeOnly ? '(active only)' : '(full history incl. archive)'}`);
    res.status(200).json({
      success: true,
      data: limitedActivities,
      count: limitedActivities.length,
      total: activities.length,
      message: 'Sales manager activities retrieved successfully'
    });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error fetching sales manager activities:`, error.message);
    res.status(500).json({ success: false, message: 'Server error fetching sales manager activities' });
  }
};
// UPDATED: Get project messages (chat history) - accessible by owner, SalesManager (for Submitted), or assigned manager (updated ID fix; extended for SalesManager chat)
// UPDATED: Get project messages (chat history) - accessible by owner, SalesManager (for Submitted), or assigned manager (FIXED: Allow owner chat during payment flow)
const getProjectMessages = async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`[${new Date().toISOString()}] Fetching messages for project: ${id} by user: ${req.user.id} (role: ${req.user.role})`);

    if (!mongoose.Types.ObjectId.isValid(id) && !id.match(/^[a-zA-Z0-9]{16}$/)) {
      return res.status(400).json({ success: false, message: 'Invalid project ID format' });
    }

    const projectQuery = buildProjectQuery(id);
    const project = await Project.findOne(projectQuery)
      .populate('userId', 'name email uniqueId department')
      .populate('messages.senderId', '_id name email uniqueId role service');

    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    // NORMALIZE: Fix legacy status to match new enum
    if (project.paymentStatus === 'Receipt Issued') {
      project.paymentStatus = 'Official Receipt Issued';
      await project.save(); // Cleanup existing data
    }

    // Authorization Check
    const isOwner = project.userId._id.toString() === req.user.id.toString();
    const isAssignedManager = project.assignedTo.some(m => m.toString() === req.user.id.toString());
    const isSales = checkIsSalesManager(req.user);
    const isFinancial = checkIsFinancialPersonnel(req.user);

    // HR Authorization Logic
    const normalizedDept = (req.user.department || '').toLowerCase().replace(/\s+/g, '-').replace(/&/g, 'and');
    const isHR = (req.user.role === 'manager' || req.user.role === 'subadmin') &&
      (normalizedDept.includes('human-resources') || normalizedDept === 'hr' || normalizedDept === 'human-resource');

    // Normalize for department check
    const normalize = (str) => (str || '').toLowerCase().trim().replace(/[-\s]+/g, '.*');
    const userContext = req.user.service || req.user.department || '';
    const isDepartmentManager = req.user.role === 'manager' && new RegExp(normalize(userContext), 'i').test(project.department);
    const isTLAssigned = req.user.role === 'tl' && project.teamLeadId && project.teamLeadId.toString() === req.user.id.toString();
    const isTeamMember = req.user.role === 'employee' && project.teamMembers && project.teamMembers.some(m => m.toString() === req.user.id.toString());

    let authorized = isOwner || isAssignedManager || isSales || isHR || isDepartmentManager || isFinancial || isTLAssigned || isTeamMember;

    if (!authorized) {
      return res.status(403).json({ success: false, message: `Access denied: You are not authorized. TL: ${isTLAssigned}, Emp: ${isTeamMember}. UID: ${req.user.id}, Proj TL: ${project.teamLeadId}` });
    }

    // Chat Rules for non-HR/non-Owner
    const paymentStatusesAllowingChat = ['Quote Sent', 'Payment Form Created', 'Payment Submitted', 'Awaiting Approval', '50% Paid', 'Official Receipt Issued', 'Full Paid'];
    if (!isOwner && !isHR && project.status === 'Submitted' && !isSales && !isTLAssigned && !isTeamMember && !paymentStatusesAllowingChat.includes(project.paymentStatus)) {
      return res.status(403).json({ success: false, message: `Chat available only with SalesManager before assignment. Proj Status: ${project.status}` });
    }

    // Sort and Filter messages
    if (project.messages && Array.isArray(project.messages)) {
      // Filter: If user is manager, exclude messages from TLs of other services
      if (req.user.role === 'manager' && req.user.service) {
        const normalizedManagerService = normalizeService(req.user.service);
        project.messages = project.messages.filter(msg => {
          const sender = msg.senderId;
          if (sender && sender.role === 'tl') {
            const senderService = normalizeService(sender.service);
            if (senderService && senderService !== normalizedManagerService) {
              return false; // Hide message from other service TL
            }
          }
          return true;
        });
      }
      project.messages.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    }

    res.status(200).json({
      success: true,
      data: {
        messages: project.messages || [],
        projectStatus: project.status,
        paymentStatus: project.paymentStatus,
        ownerId: project.userId._id,
        salesManagerId: isSales ? req.user.id : null,
        managerId: project.assignedTo?.[0] || null,
        isHR: isHR // Helpful for frontend to hide input
      },
      count: project.messages ? project.messages.length : 0,
      message: 'Project messages retrieved successfully'
    });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error fetching project messages:`, error.message);
    res.status(500).json({ success: false, message: 'Server error fetching messages' });
  }
};

// UPDATED: Send project message (chat) - only by owner, SalesManager (for Submitted), or assigned manager; HR Manager BLOCKED (Receive only)
const sendProjectMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;

    if (!content || typeof content !== 'string' || content.trim().length === 0 || content.trim().length > 1000) {
      return res.status(400).json({ success: false, message: 'Valid message content required (1-1000 chars)' });
    }

    const projectQuery = buildProjectQuery(id);
    const project = await Project.findOne(projectQuery);

    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    // NORMALIZE: Fix legacy status
    if (project.paymentStatus === 'Receipt Issued') {
      project.paymentStatus = 'Official Receipt Issued';
      await project.save();
    }

    // HR Check - Allow sending if HR personnel
    const normalizedDept = (req.user.department || '').toLowerCase().replace(/\s+/g, '-').replace(/&/g, 'and');
    const isHR = (req.user.role === 'manager' || req.user.role === 'subadmin') &&
      (normalizedDept.includes('human-resources') || normalizedDept === 'hr' || normalizedDept === 'human-resource');

    // HR Managers can now send messages related to escalations
    const isOwner = project.userId.toString() === req.user.id.toString();
    const isAssignedManager = project.assignedTo.some(m => m.toString() === req.user.id.toString());
    const isSales = checkIsSalesManager(req.user);
    const isFinancial = checkIsFinancialPersonnel(req.user);
    const isTLAssigned = req.user.role === 'tl' && project.teamLeadId && project.teamLeadId.toString() === req.user.id.toString();
    const isTeamMember = req.user.role === 'employee' && project.teamMembers && project.teamMembers.some(m => m.toString() === req.user.id.toString());

    // Normalize for department check
    const normalize = (str) => (str || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&').toLowerCase().trim().replace(/[-\s]+/g, '.*');
    const userContext = req.user.service || req.user.department || '';
    const isDepartmentManager = req.user.role === 'manager' && new RegExp(normalize(userContext), 'i').test(project.department);

    let authorized = isOwner || isAssignedManager || isSales || isHR || isDepartmentManager || isFinancial || isTLAssigned || isTeamMember;

    if (req.user.role === 'admin' || req.user.role === 'superadmin') {
      authorized = true;
    }

    if (!authorized) {
      return res.status(403).json({ success: false, message: 'Access denied: You are not authorized to send messages for this project.' });
    }

    // Chat Rules - Owners, HR Managers and SalesManagers always authorized to chat if they have access
    const paymentStatusesAllowingChat = ['Quote Sent', 'Payment Form Created', 'Payment Submitted', 'Awaiting Approval', '50% Paid', 'Official Receipt Issued', 'Full Paid'];
    if (req.user.role !== 'admin' && req.user.role !== 'superadmin' && !isOwner && !isHR && !isSales && !isTLAssigned && !isTeamMember && project.status === 'Submitted' && !paymentStatusesAllowingChat.includes(project.paymentStatus)) {
      return res.status(403).json({ success: false, message: 'Chat available only with SalesManager before assignment or during payment flow' });
    }

    // Add message
    await project.addMessage(content.trim(), req.user.id);
    // Re-populate for response
    await project.populate('messages.senderId', '_id name email uniqueId role'); // UPDATED: Include _id
    // Get latest message
    const latestMessage = project.messages[project.messages.length - 1];
    // FIXED: Retrieve io dynamically from app
    const io = req.app.get('io');
    if (io) {
      // UPDATED: Emit real-time update to project room (owner, sales, and manager)
      const room = `project_${project._id}`;
      io.to(room).emit('newMessage', {
        message: latestMessage,
        projectId: id
      });
      // Global Notifications for Header functionality
      io.to(`user_${project.userId}`).emit('newMessage', {
        message: latestMessage,
        projectId: id
      });
      if (project.assignedTo && project.assignedTo.length) {
        project.assignedTo.forEach(managerId => {
          io.to(`user_${managerId}`).emit('newMessage', {
            message: latestMessage,
            projectId: id
          });
        });
      }
      console.log(`[${new Date().toISOString()}] Message sent and emitted: ${latestMessage._id} for project ${project.uniqueId} to room ${room}`);
    } else {
      console.warn(`[${new Date().toISOString()}] Warning: io instance not available for emission in project ${id}`);
    }
    res.status(201).json({
      success: true,
      data: {
        message: latestMessage,
        projectStatus: project.status,
        paymentStatus: project.paymentStatus, // NEW: Include for frontend
      },
      message: 'Message sent successfully'
    });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error sending project message:`, error.message, error.stack);
    res.status(500).json({ success: false, message: 'Server error sending message' });
  }
};
// Controller/projectController.js (UPDATED: NEW: getSalesAllAssignedProjects - Fetches all assigned projects for Sales Manager view (Under Review, In Progress, Completed); Populates assignedTo for manager details; Sorts by submittedAt desc; Includes formSummary; Enhanced logging) (updated: Filter post-assignment)
const getSalesAllAssignedProjects = async (req, res) => {
  try {
    console.log(`[${new Date().toISOString()}] Fetching all assigned projects for SalesManager: ${req.user.id} in dept: ${req.user.department}`);
    // Validate user ID to prevent CastError
    if (!mongoose.Types.ObjectId.isValid(req.user.id)) {
      console.error(`[${new Date().toISOString()}] Invalid ObjectId for user: ${req.user.id}`);
      return res.status(400).json({ success: false, message: 'Invalid user ID format' });
    }
    // Feature Request: Filter for "Drug Discovery" if implied or requested, or return all global assigned
    // User requested: "get the all drug-discovery service project and also assigned the project"
    // So if the user's scope is Drug Discovery (Sales Manager for DD), filter by that.

    const query = {
      assignedTo: { $exists: true, $ne: [] } // Ensure assigned
    };

    const { department } = req.query;
    let filterDept = department;

    // Use query parameter if provided, otherwise fallback to manager's service
    if (!filterDept && req.user.service && req.user.role === 'manager') {
      const normalizeMap = {
        'ngs': 'NGS',
        'drugdiscovery': 'Drug Discovery',
        'softwaredevelopment': 'Software Development',
        'microbiology': 'Microbiology',
        'biochemistry': 'Biochemistry',
        'molecularbiology': 'Molecular Biology'
      };
      const userServiceNorm = req.user.service.toLowerCase().replace(/[^a-z]/g, '');
      for (const [key, val] of Object.entries(normalizeMap)) {
        if (userServiceNorm.includes(key)) {
          filterDept = val;
          break;
        }
      }
    }

    if (filterDept) {
      const cleanDept = String(filterDept).trim().replace(/[-\s]+/g, '[-\\s]+');
      query.department = { $regex: new RegExp(cleanDept, 'i') };
    }

    const rawProjects = await Project.find(query)
      .populate('userId reviewerId assignedTo', 'name email uniqueId department phone branch role') // Fuller population for sales view
      .populate('activities.updatedBy', 'name role')
      .populate('messages.senderId', '_id name email uniqueId role')
      .sort({ submittedAt: -1 });

    // Filter out orphaned projects where userId is null after population
    const projects = rawProjects.filter(p => p.userId);
    console.log(`[getSalesAllAssignedProjects] Raw: ${rawProjects.length}, After null-userId filter: ${projects.length}`);
    projects.forEach(project => {
      if (project.activities && Array.isArray(project.activities)) {
        project.activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      }
      if (project.messages && Array.isArray(project.messages)) {
        project.messages.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      }
    });
    projects.forEach(project => {
      if (project.category === 'New Project' && project.formData) {
        const config = departmentFormFields[project.department];
        if (config) {
          project.formSummary = {};
          config.requiredFields.slice(0, 3).forEach(field => {
            project.formSummary[field] = project.formData[field];
          });
        }
      }
    });
    res.status(200).json({
      success: true,
      data: projects,
      count: projects.length
    });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error fetching sales assigned projects:`, error.message, error.stack);
    res.status(500).json({ success: false, message: 'Server error fetching assigned projects' });
  }
};
// Helper to check if user is SalesManager (for inline use)
const isSalesManager = (user) => {
  return user.role === 'manager' && user.department.toLowerCase() === 'sales & customer support';
};
// -------------------------------------------------------------------------
// NEW: Universal Workflow & Role Hierarchy Implementation
// -------------------------------------------------------------------------

// Helper: Service Matching Validation
const validateServiceMatch = (user, targetDepartment) => {
  if (!user || !targetDepartment) return false;
  // Normalize strings
  const userService = (user.service || user.department || '').toLowerCase().replace(/&/g, 'and').replace(/\s+/g, ' ');
  const target = targetDepartment.toLowerCase().replace(/&/g, 'and').replace(/\s+/g, ' ');

  // Strict check or containment (e.g. "Drug Discovery" matches "Drug Discovery")
  return userService === target || userService.includes(target) || target.includes(userService);
};

// Step 1: Service Manager Review
const reviewProjectByServiceManager = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, remarks, quotedAmount } = req.body; // status: 'Approved' | 'Rejected'

    if (!['Approved', 'Rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status. Must be Approved or Rejected' });
    }

    const project = await Project.findById(id);
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

    // Validate Status Flow
    if (project.workflowStep !== 1) {
      return res.status(400).json({ success: false, message: 'Pending previous approvals: Project is not in Service Manager Review step' });
    }

    // Validate Role, Service & Assignment
    const isAssigned = project.assignedTo && project.assignedTo.some(id => id.toString() === req.user.id.toString());
    const isGlobalAdmin = req.user.role === 'admin' || req.user.role === 'superadmin';

    if (req.user.role !== 'manager' || !validateServiceMatch(req.user, project.department) || (!isAssigned && !isGlobalAdmin)) {
      return res.status(403).json({ success: false, message: 'Denied: Only the assigned Service Manager of this service can review.' });
    }

    // Action
    project.approvals.serviceManager = {
      status,
      reviewedBy: req.user.id,
      reviewedAt: new Date(),
      remarks
    };

    if (status === 'Approved') {
      // Save quote amount if provided
      if (quotedAmount) {
        project.quotedAmount = Number(quotedAmount);
      }

      project.workflowStep = 2; // Move to Step 2: Cross-dept Approval
      await project.logActivity(`Service Manager Approved. Amount: $${(project.quotedAmount || 0).toLocaleString()}. Moving to Financial/HR Review.`, req.user.id);
    } else {
      project.status = 'Submitted'; // Send back? Or keep Under Review but Rejected approval
      // If rejected, maybe reset or specific handling. For now, just log.
      await project.logActivity(`Service Manager Rejected: ${remarks}`, req.user.id);
    }

    await project.save();
    res.status(200).json({ success: true, message: `Service Manager ${status}`, data: project });

  } catch (error) {
    console.error('Error in Service Manager Review:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Step 2a: Financial Manager Review
const reviewProjectByFinancial = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, remarks } = req.body;

    const project = await Project.findById(id);
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

    // Validate Step
    if (project.workflowStep !== 2) {
      return res.status(400).json({ success: false, message: 'Pending previous approvals: Service Manager must approve first.' });
    }

    // Validate Role: Financial Manager
    const userDept = (req.user.department || '').toLowerCase();
    if (req.user.role !== 'manager' || !userDept.includes('financial')) {
      return res.status(403).json({ success: false, message: 'Denied: Only Financial Manager can perform this review.' });
    }

    project.approvals.financial = {
      status,
      reviewedBy: req.user.id,
      reviewedAt: new Date(),
      remarks
    };

    await project.save();
    await project.logActivity(`Financial Manager ${status}`, req.user.id);

    // Check availability for Step 3
    if (project.approvals.hr.status === 'Approved' && status === 'Approved') {
      project.workflowStep = 3;
      await project.logActivity('Cross-department approvals complete. Ready for TL Assignment.', req.user.id);
      await project.save();
    }

    res.status(200).json({ success: true, message: `Financial Review ${status}`, data: project });

  } catch (error) {
    console.error('Error in Financial Review:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Step 2b: HR Manager Review
const reviewProjectByHR = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, remarks } = req.body;

    const project = await Project.findById(id);
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

    // Validate Step
    if (project.workflowStep !== 2) {
      return res.status(400).json({ success: false, message: 'Pending previous approvals: Service Manager must approve first.' });
    }

    // Validate Role: HR Manager
    const userDept = (req.user.department || '').toLowerCase();
    // Allow HR Manager or Subadmin (HR)
    const isHR = (req.user.role === 'manager' && userDept.includes('human resources')) ||
      (req.user.role === 'subadmin' && userDept.includes('human resources'));

    if (!isHR) {
      return res.status(403).json({ success: false, message: 'Denied: Only HR Manager can perform this review.' });
    }

    project.approvals.hr = {
      status,
      reviewedBy: req.user.id,
      reviewedAt: new Date(),
      remarks
    };

    await project.save();
    await project.logActivity(`HR Manager ${status} (Personnel Availability)`, req.user.id);

    // Check availability for Step 3
    if (project.approvals.financial.status === 'Approved' && status === 'Approved') {
      project.workflowStep = 3;
      await project.logActivity('Cross-department approvals complete. Ready for TL Assignment.', req.user.id);
      await project.save();
    }

    res.status(200).json({ success: true, message: `HR Review ${status}`, data: project });

  } catch (error) {
    console.error('Error in HR Review:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Step 3: Assign to Team Lead (Updated)
const assignToTeamLead = async (req, res) => {
  try {
    const { id } = req.params;
    const { teamLeadId } = req.body;

    const project = await Project.findById(id);
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

    // Validate Workflow Order
    if (project.workflowStep < 2) {
      return res.status(400).json({ success: false, message: 'Pending previous approvals: Service Manager Review not complete.' });
    }

    const isGlobalAdmin = req.user.role === 'admin' || req.user.role === 'superadmin';

    // Validate User (Assigned Service Manager)
    const isAssigned = project.assignedTo && project.assignedTo.some(aid => aid.toString() === req.user.id.toString());
    if (!isGlobalAdmin && (req.user.role !== 'manager' || !validateServiceMatch(req.user, project.department) || !isAssigned)) {
      return res.status(403).json({ success: false, message: 'Denied: Only the assigned Service Manager can assign TL.' });
    }

    // Validate TL (Same Service)
    const tl = await User.findById(teamLeadId);
    if (!tl || tl.role !== 'tl') return res.status(400).json({ success: false, message: 'Invalid User: Must be a Team Lead.' });

    if (!validateServiceMatch(tl, project.department)) {
      return res.status(400).json({ success: false, message: `Denied: TL must belong to ${project.department}.` });
    }

    // Action
    project.teamLeadId = teamLeadId;
    project.workflowStep = 4; // Move to Step 4: Team Formation
    await project.save();
    await project.logActivity(`Assigned to Team Lead ${tl.name}`, req.user.id);

    res.status(200).json({ success: true, message: 'TL Assigned. Project moved to Team Formation.', data: project });

  } catch (error) {
    console.error('Error assigning TL:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Step 4: Assign Team Members (Updated)
const assignTeamMembers = async (req, res) => {
  try {
    const { id } = req.params;
    const { memberIds } = req.body; // Array of IDs

    if (!memberIds || !Array.isArray(memberIds) || memberIds.length === 0) {
      return res.status(400).json({ success: false, message: 'memberIds array is required.' });
    }

    const project = await Project.findById(id);
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

    const isGlobalAdmin = req.user.role === 'admin' || req.user.role === 'superadmin';

    // Validate User (Assigned TL) — supports both formal 4-step workflow (teamLeadId)
    // and direct-assignment flow (assignedTo contains TL id for backward compatibility).
    if (!isGlobalAdmin && req.user.role !== 'tl') {
      return res.status(403).json({ success: false, message: 'Denied: Only a Team Lead can form the team.' });
    }

    const tlId = req.user.id.toString();
    const isAssignedViaTeamLead = project.teamLeadId?.toString() === tlId;
    const isAssignedViaAssignedTo = Array.isArray(project.assignedTo) &&
      project.assignedTo.some(aid => aid.toString() === tlId);

    if (!isGlobalAdmin && !isAssignedViaTeamLead && !isAssignedViaAssignedTo) {
      return res.status(403).json({ success: false, message: 'Denied: You are not assigned as Team Lead for this project.' });
    }

    // Validate Workflow Order — allow workflowStep 4 (formal) OR directly-assigned TL (step 0/3)
    const isReadyForTeamFormation = isGlobalAdmin || project.workflowStep === 4 || isAssignedViaTeamLead || isAssignedViaAssignedTo;
    if (!isReadyForTeamFormation) {
      return res.status(400).json({ success: false, message: 'Pending previous approvals: Project not ready for Team Formation.' });
    }

    // Validate Employees (Same Service)
    const employees = await User.find({ _id: { $in: memberIds } });
    const invalidServiceEmployees = employees.filter(e => !validateServiceMatch(e, project.department));

    if (invalidServiceEmployees.length > 0) {
      return res.status(400).json({ success: false, message: `Denied: All employees must belong to ${project.department}. Invalid: ${invalidServiceEmployees.map(e => e.name).join(', ')}` });
    }

    project.teamMembers = memberIds;
    // Status update?
    if (project.status === 'Under Review') project.status = 'In Progress';

    await project.save();
    await project.logActivity('Team formed by TL', req.user.id);

    // --- Automatic Chat Creation ---
    // Check if a conversation already exists for this project (team chat)
    let conversation = await Conversation.findOne({
      relatedId: project._id,
      relatedModel: 'Project',
      type: 'group'
    });

    if (!conversation) {
      // Create new conversation
      const safeMemberIds = Array.isArray(memberIds) ? memberIds : [];
      const conversationMembers = [
        { userId: req.user.id, role: 'admin' }, // TL is admin
        ...safeMemberIds.map(mId => ({ userId: mId, role: 'member' }))
      ];

      conversation = new Conversation({
        type: 'group',
        name: `${project.uniqueId} - Team Chat`,
        description: `Official team channel for project ${project.uniqueId}`,
        relatedId: project._id,
        relatedModel: 'Project',
        members: conversationMembers,
        createdBy: req.user.id
      });
      await conversation.save();

      // Emit real-time event if io is available (optional but good)
      const io = req.app.get('io');
      if (io) {
        // Notify members about new conversation
        conversationMembers.forEach(m => {
          io.to(m.userId.toString()).emit('newConversation', conversation);
        });
      }
    } else {
      // Optional: Update members if chat already exists (e.g. re-assignment)
      // For now, minimal logic: ensure current TL and new members are in.
      // We won't implement complex merging unless requested, but preventing duplicates is good.
    }
    // --- End Chat Creation ---

    res.status(200).json({ success: true, message: 'Team formed successfully and team chat created.', data: project });

  } catch (error) {
    console.error('Error forming team:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ------------------------------------
// Employee Reporting Workflow
// ------------------------------------

const submitEmployeeReport = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, type } = req.body; // type: 'Progress', 'Manpower', 'Issue'

    const project = await Project.findById(id);
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

    // Validate User (Employee in the team)
    // Note: User said "If employee does NOT have a TL role". 
    // Usually means "If employee is not supervised?" OR "If User.role != TL". 
    // Assuming "User is Employee".
    // "Employee can submit a report directly to the Service Manager." regarding "if employee does NOT have TL role". 
    // This part is ambiguous: "If the employee does NOT have a TL role".
    // Probably means: "If there is no TL assigned to them?" OR "Any employee".
    // I will allow any assigned team member to report.

    const isMember = project.teamMembers.some(m => m.toString() === req.user.id.toString()) ||
      (project.userId && project.userId.toString() === req.user.id.toString()); // Or Owner?

    // For now allow any employee role.

    const report = {
      submittedBy: req.user.id,
      title,
      content,
      type: type || 'Progress',
      status: 'Pending',
      createdAt: new Date()
    };

    project.reports.push(report);
    await project.save();
    await project.logActivity(`Report submitted: ${title}`, req.user.id);

    res.status(200).json({ success: true, message: 'Report submitted to Service Manager.', data: project });

  } catch (error) {
    console.error('Error submitting report:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const reviewReportByManager = async (req, res) => {
  try {
    const { id, reportId } = req.params;
    const { action, remarks } = req.body; // action: 'Resolve', 'Escalate'

    const project = await Project.findById(id);
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

    const report = project.reports.id(reportId);
    if (!report) return res.status(404).json({ success: false, message: 'Report not found' });

    // Validate Manager (Assigned Service Manager)
    const isAssigned = project.assignedTo && project.assignedTo.some(aid => aid.toString() === req.user.id.toString());
    const isGlobalAdmin = req.user.role === 'admin' || req.user.role === 'superadmin';

    if (!isGlobalAdmin && (req.user.role !== 'manager' || !validateServiceMatch(req.user, project.department) || !isAssigned)) {
      return res.status(403).json({ success: false, message: 'Denied: Only the assigned Service Manager can review reports.' });
    }

    if (action === 'Escalate') {
      report.status = 'Escalated to HR';
      report.managerRemarks = remarks;
      report.escalatedAt = new Date();
      // Notify HR logic here (omitted for brevity)
    } else {
      report.status = 'Reviewed'; // Or Resolved
      report.managerRemarks = remarks;
    }

    await project.save();

    // Notify HR via Socket.io
    const io = req.app.get('io');
    if (io) {
      if (action === 'Escalate') {
        io.emit('hrEscalationUpdate', { projectId: project._id, reportId: report._id, action: 'escalated' });
      } else {
        io.emit('hrEscalationUpdate', { projectId: project._id, reportId: report._id, action: 'reviewed' });
      }
    }

    res.status(200).json({ success: true, message: `Report ${action}d`, data: project });

  } catch (error) {
    console.error('Error reviewing report:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const hrHiringAction = async (req, res) => {
  try {
    const { id, reportId } = req.params;
    const { response, action } = req.body; // 'accept' or 'resolve'

    // Validate HR
    const userRole = (req.user.role || '').toLowerCase();
    const userDept = (req.user.department || '').toLowerCase().replace(/\s+/g, '-').replace(/&/g, 'and');
    const isHRDept = userDept.includes('human-resources') || userDept === 'hr' || userDept.includes('human-resource');

    if (!isHRDept) {
      return res.status(403).json({ success: false, message: 'Denied: HR department only.' });
    }

    const isHRPersonnelRecord = (userRole === 'manager' || userRole === 'subadmin' || userRole === 'admin') && isHRDept;
    if (!isHRPersonnelRecord) {
      return res.status(403).json({ success: false, message: 'Denied: Authorized HR personnel (Manager/Subadmin/Admin) only.' });
    }

    // Try finding Project first, then Conversation
    let project = await Project.findById(id);
    let conversation = null;

    if (!project) {
      conversation = await Conversation.findById(id);
      if (!conversation) {
        return res.status(404).json({ success: false, message: 'Project or Escalation not found' });
      }
    }

    // Handle Project-based Escalation
    if (project) {
      const report = project.reports.id(reportId);
      if (!report) return res.status(404).json({ success: false, message: 'Report not found' });

      if (action === 'accept') {
        if (report.status !== 'Escalated to HR') {
          return res.status(400).json({ success: false, message: 'Report is not in escalated status.' });
        }
        report.status = 'Accepted by HR';
        await project.logActivity(`Escalation accepted by HR Manager: ${req.user.name}`, req.user.id);
      } else if (action === 'resolve') {
        if (report.status !== 'Accepted by HR' && report.status !== 'Escalated to HR') {
          return res.status(400).json({ success: false, message: 'Invalid status for resolution.' });
        }
        report.status = 'Resolved';
        report.hrResponse = response;
        await project.logActivity(`Escalation resolved by HR Manager: ${req.user.name}`, req.user.id);

        // 1. Send automated message back to the Service Manager via Project Chat
        await project.addMessage(`**[HR RESOLUTION]** ${response}`, req.user.id);

        // 2. Send real-time notification to the Escalation Group Conversation
        try {
          const escalationGroup = await Conversation.findOne({
            type: 'group',
            contextStringType: 'Escalation',
            contextStringValue: 'HR',
            'members.userId': report.submittedBy
          });

          if (escalationGroup) {
            const resMessage = new Message({
              conversationId: escalationGroup._id,
              senderId: req.user.id,
              content: `**[HR RESOLUTION]** ${response}`,
              contentType: 'text',
              metadata: { isResolution: true, projectId: project._id },
              isSystemMessage: true
            });
            await resMessage.save();

            await Conversation.findByIdAndUpdate(escalationGroup._id, {
              lastMessage: resMessage._id,
              lastMessageAt: new Date()
            });
          }
        } catch (chatError) {
          console.warn('Failed to send real-time notification to escalation chat:', chatError);
        }
      } else {
        return res.status(400).json({ success: false, message: 'Invalid action (accept/resolve required).' });
      }
      await project.save();
    }
    // Handle Direct Chat Escalation
    else if (conversation) {
      if (action === 'accept') {
        conversation.status = 'Accepted by HR';
        const msg = new Message({
          conversationId: conversation._id,
          senderId: req.user.id,
          content: `**[ESCALATION ACCEPTED]** by ${req.user.name}`,
          isSystemMessage: true
        });
        await msg.save();
      } else if (action === 'resolve') {
        conversation.status = 'Resolved';
        const msg = new Message({
          conversationId: conversation._id,
          senderId: req.user.id,
          content: `**[HR RESOLUTION]** ${response}`,
          isSystemMessage: true
        });
        await msg.save();
      } else {
        return res.status(400).json({ success: false, message: 'Invalid action.' });
      }
      await conversation.save();
    }

    // Notify HR and others via Socket.io
    const io = req.app.get('io');
    if (io) {
      io.emit('hrEscalationUpdate', { projectId: id, reportId, action });
    }

    res.status(200).json({ success: true, message: `HR Action (${action}) logged.`, data: project || conversation });

  } catch (error) {
    console.error('Error HR action:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};


// ------------------------------------
// Existing Data Fetchers (Preserved)
// ------------------------------------

// NEW: Get Projects Pending Approval (for Fin/HR)
const getProjectsForApproval = async (req, res) => {
  try {
    const userDept = (req.user.department || '').toLowerCase();
    let query = {};

    if (userDept.includes('financial')) {
      query = {
        workflowStep: 2,
        'approvals.financial.status': 'Pending'
      };
    } else if (userDept.includes('human resources') || userDept.includes('hr') || userDept.includes('human-resource')) {
      query = {
        workflowStep: 2,
        'approvals.hr.status': 'Pending'
      };
    } else {
      return res.status(403).json({ success: false, message: 'Not authorized for global approvals' });
    }

    const projects = await Project.find(query)
      .populate('userId', 'name email department')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: projects.length, data: projects });
  } catch (error) {
    console.error('Error fetching approval projects:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const getDrugDiscoveryTLs = async (req, res) => {
  try {
    const requestedService = req.query.service || req.user.service || req.user.department || 'drug-discovery';
    const normalize = (str) => (typeof str === 'string' ? str : String(str || '')).toLowerCase().trim().replace(/[-\s]+/g, '.*');
    const serviceRegex = new RegExp(normalize(requestedService), 'i');

    const potentialTLs = await User.find({
      role: 'tl',
      isActive: true,
      $or: [
        { service: { $regex: serviceRegex } },
        { department: { $regex: serviceRegex } }
      ]
    }).select('_id name email uniqueId service department');
    res.status(200).json({ success: true, count: potentialTLs.length, data: potentialTLs });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error fetching TLs' });
  }
};

const getDrugDiscoveryEmployees = async (req, res) => {
  try {
    const requestedService = req.query.service || req.user.service || req.user.department || 'drug-discovery';
    const normalize = (str) => (typeof str === 'string' ? str : String(str || '')).toLowerCase().trim().replace(/[-\s]+/g, '.*');
    const serviceRegex = new RegExp(normalize(requestedService), 'i');

    const potentialEmployees = await User.find({
      role: 'employee',
      isActive: true,
      $or: [
        { service: { $regex: serviceRegex } },
        { department: { $regex: serviceRegex } }
      ]
    }).select('_id name email uniqueId service department');
    res.status(200).json({ success: true, count: potentialEmployees.length, data: potentialEmployees });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error fetching employees' });
  }
};

// Notify client about overdue payment
const sendPaymentWarning = async (req, res) => {
  try {
    const { id } = req.params;
    const project = await Project.findById(id).populate('userId', 'name email');

    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

    // Auth check: Manager of department OR Sales Manager
    const normalizedUserDept = (req.user.department || '').toLowerCase().replace(/&/g, 'and').replace(/\s+/g, ' ');
    const isSalesManager = req.user.role === 'manager' && (normalizedUserDept.includes('sales') || normalizedUserDept.includes('customer service'));
    const isDeptManager = req.user.role === 'manager' && validateServiceMatch(req.user, project.department);

    if (!isSalesManager && !isDeptManager) {
      console.log(`[Auth Fail] User: ${req.user.id}, Role: ${req.user.role}, Service: ${req.user.service || req.user.department}, ProjectDept: ${project.department}`);
      return res.status(403).json({ success: false, message: 'Unauthorized: Access restricted to Sales or Department Managers' });
    }

    // Sanity check
    if (project.paymentStatus === 'Full Paid') {
      console.log(`[Warning Fail] Project ${project.uniqueId} is already Full Paid.`);
      return res.status(400).json({ success: false, message: 'Project is already fully paid.' });
    }

    const message = `Payment Warning: Your project ${project.uniqueId} has an overdue balance. Please settle immediately to avoid service interruption.`;

    // 1. Log Activity
    await project.logActivity('Payment Warning Sent to Client', req.user.id, { remarks: 'Overdue balance warning' });

    // 2. Add to Project Chat (visible to user)
    project.messages.push({
      senderId: req.user.id,
      content: `**Urgent**: ${message}`,
      timestamp: new Date()
    });

    await project.save();

    // 3. Emit socket event
    const io = req.app.get('io');
    if (io) {
      io.to(`project_${project._id}`).emit('newMessage', {
        message: project.messages[project.messages.length - 1],
        projectId: project._id
      });
      io.to(`project_${project._id}`).emit('notification', {
        title: 'Payment Warning',
        message
      });
    }

    res.status(200).json({ success: true, message: 'Warning sent successfully' });
  } catch (error) {
    console.error('Error sending payment warning:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Halt (Stop) or Resume Project
const toggleProjectHold = async (req, res) => {
  try {
    const { id } = req.params;
    const { action, reason } = req.body; // action: 'hold' or 'resume'

    const project = await Project.findById(id);
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

    // Auth check
    if (req.user.role !== 'manager' || !validateServiceMatch(req.user, project.department)) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    if (action === 'hold') {
      project.status = 'On Hold';
      await project.logActivity(`Project Stopped (On Hold)`, req.user.id, { remarks: reason || 'Payment overdue' });
    } else if (action === 'resume') {
      // Restore logical status based on workflow
      if (project.paymentStatus === 'Full Paid' || project.teamMembers.length > 0) {
        project.status = 'In Progress';
      } else if (project.assignedTo.length > 0) {
        project.status = 'Under Review';
      } else {
        project.status = 'Submitted';
      }
      await project.logActivity(`Project Resumed`, req.user.id, { remarks: reason || 'Payment settled' });
    } else {
      return res.status(400).json({ success: false, message: 'Invalid action' });
    }

    await project.save();
    res.status(200).json({ success: true, message: `Project ${action === 'hold' ? 'stopped' : 'resumed'}`, data: project });

  } catch (error) {
    console.error('Error toggling project hold:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// NEW: Send message from TL to Service Manager
const sendMessageToManager = async (req, res) => {
  try {
    const { subject, message, projectId, service } = req.body;
    const tlId = req.user.id;

    console.log(`[${new Date().toISOString()}] TL ${tlId} sending message to manager for service: "${service}"`);

    // Validation
    if (typeof subject !== 'string' || typeof message !== 'string' || subject.trim().length === 0 || message.trim().length < 10) {
      return res.status(400).json({
        success: false,
        message: 'Subject and message (min 10 chars) are required and must be strings'
      });
    }

    // Find TL details
    const tl = await User.findById(tlId).select('name email uniqueId service department role');
    if (!tl) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Determine target service
    const targetServiceRaw = service || tl.service || tl.department || '';
    if (!targetServiceRaw) {
      return res.status(400).json({ success: false, message: 'Could not determine service context.' });
    }

    // Normalize logic
    const normalize = (str) => (typeof str === 'string' ? str : String(str || '')).toLowerCase().trim().replace(/[^a-z0-9]/g, '');
    const targetServiceNormalized = normalize(targetServiceRaw);

    console.log(`[${new Date().toISOString()}] Looking for managers with service matching: "${targetServiceRaw}" (norm: ${targetServiceNormalized})`);

    // Fetch ALL active managers
    const allManagers = await User.find({ role: 'manager', isActive: true })
      .select('_id name email uniqueId service department');

    // Filter for matches (Strict Match Logic for known services)
    const matchingManagers = allManagers.filter(m => {
      const mService = normalize(m.service);
      const mDept = normalize(m.department);

      // Strict list of known services to prevent broad partial matches
      const knownServices = ['ngs', 'drugdiscovery', 'softwaredevelopment', 'microbiology', 'biochemistry', 'molecularbiology', 'sales'];

      // If target is a known service, check for exact containment of that token, not just substring
      // But keeping it simple: Check directionality carefully

      // 1. Manager Service/Dept contains Target (e.g. Manager="Drug Discovery Dept" target="Drug Discovery") -> OK
      // 2. Target contains Manager (e.g. Target="Senior Drug Discovery" Manager="Drug Discovery") -> OK

      const matchService = mService.includes(targetServiceNormalized) || targetServiceNormalized.includes(mService);
      const matchDept = mDept.includes(targetServiceNormalized) || targetServiceNormalized.includes(mDept);

      return matchService || matchDept;
    });

    if (matchingManagers.length === 0) {
      console.warn(`[${new Date().toISOString()}] No manager found for service "${targetServiceRaw}". Active managers found: ${allManagers.length}`);
      return res.status(404).json({
        success: false,
        message: `No active manager found for ${targetServiceRaw}. Please contact admin.`
      });
    }

    console.log(`[${new Date().toISOString()}] Found ${matchingManagers.length} managers for service message: ${matchingManagers.map(m => m.name).join(', ')}`);

    // Create audit event for the message
    await AuditEvent.create({
      actorId: tlId,
      action: 'TL_MESSAGE_TO_MANAGER',
      targetType: 'User',
      targetId: matchingManagers[0]._id, // First one as primary target for schema
      metadata: {
        subject,
        messagePreview: (typeof message === 'string' ? message : '').substring(0, 100),
        projectId: projectId || null,
        service: targetServiceRaw,
        recipientCount: matchingManagers.length
      }
    });

    // If project-specific, add to project activity AND project messages
    if (projectId && mongoose.Types.ObjectId.isValid(projectId)) {
      const project = await Project.findById(projectId);
      if (project) {
        // Log Activity for Manager Dashboard "Activities" visibility
        await project.logActivity(
          `TL Message: ${subject} (Sent to ${matchingManagers.length} Service Managers)`,
          tlId,
          { messageType: 'TL_TO_MANAGER', subject }
        );

        // Add to project messages for "Project Chat" visibility
        if (typeof project.addMessage === 'function') {
          await project.addMessage(`**${subject}**\n\n${message}`, tlId);
        } else {
          project.messages.push({
            senderId: tlId,
            content: `**${subject}**\n\n${message}`,
            timestamp: new Date()
          });
          await project.save();
        }
      }
    }

    // Chat System Integration: Ensure all managers receive the message in a Conversation
    try {
      // Create/Find Group Conversation for this Service Context
      // Schema: contextStringType='Service', contextStringValue=targetServiceRaw

      let conversation = await Conversation.findOne({
        contextStringType: 'Service',
        contextStringValue: targetServiceRaw,
        'members.userId': tlId
      });

      if (!conversation) {
        // Create new conversation
        const memberIds = [tlId, ...matchingManagers.map(m => m._id.toString())];
        // Dedupe
        const uniqueIds = [...new Set(memberIds)];

        conversation = new Conversation({
          type: 'group',
          name: `${targetServiceRaw} Service Channel`,
          description: `Communication channel for ${targetServiceRaw} service`,
          contextStringType: 'Service',
          contextStringValue: targetServiceRaw,
          createdBy: tlId,
          members: uniqueIds.map(uid => ({ userId: uid, role: 'member' }))
        });
        await conversation.save();
      } else {
        // Ensure all managers are members
        const currentMemberIds = conversation.members.map(m => m.userId.toString());
        let updated = false;
        matchingManagers.forEach(m => {
          if (!currentMemberIds.includes(m._id.toString())) {
            conversation.members.push({ userId: m._id, role: 'admin' });
            updated = true;
          }
        });
        if (updated) await conversation.save();
      }

      // Add Message to Conversation
      const chatMsg = new Message({
        conversationId: conversation._id,
        senderId: tlId,
        content: `**${subject}**\n${message}`,
        contentType: 'text'
      });
      await chatMsg.save();

      conversation.lastMessage = chatMsg._id;
      conversation.lastMessageAt = new Date();
      await conversation.save();

      // Socket Emission
      const io = req.app.get('io');
      if (io) {
        io.to(`conversation_${conversation._id}`).emit('newMessage', chatMsg);
      }

    } catch (chatError) {
      console.error(`[${new Date().toISOString()}] Chat system integration error:`, chatError);
      // Don't fail the whole request if chat system fails, but log it
    }

    res.status(200).json({
      success: true,
      message: 'Message sent to Service Manager(s) successfully',
      managersNotified: matchingManagers.length
    });

  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error in sendMessageToManager:`, error);
    res.status(500).json({ success: false, message: 'Server error sending message' });
  }
};

// NEW: Request Financial Review (Service Manager)
const requestFinancialReview = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      reason,
      selectedProducts, // Keep for legacy
      software,
      consumable,
      kits,
      others,
      vendors // Should be a JSON string if sent via FormData
    } = req.body;

    console.log('[DEBUG] Financial Review Request Body:', req.body); // DEBUG LOG
    console.log('[DEBUG] Files:', req.files?.length); // DEBUG LOG

    const managerId = req.user.id;

    console.log(`[${new Date().toISOString()}] Financial review request for project ${id} by manager ${managerId}`);

    // Validation
    if (typeof reason !== 'string' || reason.trim().length < 10) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a detailed reason (min 10 chars) and ensure it is a string'
      });
    }

    const project = await Project.findById(id);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    // Check permissions
    const isAssigned = project.assignedTo && project.assignedTo.some(
      assignee => assignee.toString() === managerId
    );
    const isSales = checkIsSalesManager(req.user);
    const isAdmin = ['admin', 'superadmin', 'subadmin'].includes(req.user.role.toLowerCase());
    const isServiceManager = req.user.role === 'manager' && (
      (req.user.department && req.user.department === project.department) ||
      ((req.user.department || '').toLowerCase() === (project.department || '').toLowerCase()) ||
      (req.user.service && req.user.service === project.department) ||
      ((req.user.service || '').toLowerCase() === (project.department || '').toLowerCase())
    );

    if (!isAssigned && !isSales && !isAdmin && !isServiceManager) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to request financial review for this project'
      });
    }

    // Verify financialReview object exists
    if (!project.financialReview) {
      project.financialReview = {};
    }

    // Process files
    let attachments = [];
    if (req.files && req.files.length > 0) {
      const totalSize = req.files.reduce((acc, f) => acc + (f.size || 0), 0);
      const storageCheck = await checkStorageLimit(req.user.id, totalSize);
      if (!storageCheck.allowed) {
        safeUnlinkMultiple(req.files);
        return res.status(400).json({ success: false, message: `Storage limit exceeded. Remaining: ${storageCheck.remainingMB} MB.` });
      }

      attachments = req.files.map(file => {
        const absolutePath = file.path.replace(/\\/g, '/');
        const relativePath = absolutePath.includes('uploads/')
          ? 'uploads/' + absolutePath.split('uploads/')[1]
          : absolutePath;

        return {
          path: relativePath,
          filename: file.originalname,
          mimetype: file.mimetype,
          size: file.size
        };
      });
      // Register in Drive
      await registerFilesToDrive(req.user.id, req.files, 'Project Attachment', project._id);
    }

    // Parse vendors if it's a string
    let parsedVendors = [];
    if (vendors) {
      try {
        parsedVendors = typeof vendors === 'string' ? JSON.parse(vendors) : vendors;
      } catch (e) {
        console.error('Error parsing vendors:', e);
      }
    }

    // Update individual properties
    project.financialReview.requested = true;
    project.financialReview.status = 'Pending';
    project.financialReview.requestedBy = managerId;
    project.financialReview.requestReason = reason;

    // New fields
    project.financialReview.software = software || '';
    project.financialReview.consumable = consumable || '';
    project.financialReview.kits = kits || '';
    project.financialReview.others = others || '';
    project.financialReview.vendors = parsedVendors.map(v => {
      const vendorData = {
        details: v.details,
        amount: Number(v.amount) || 0
      };

      // Check if this vendor has an assigned attachment index
      if (typeof v.attachmentIndex === 'number' && v.attachmentIndex >= 0 && req.files && req.files[v.attachmentIndex]) {
        const file = req.files[v.attachmentIndex];
        const absolutePath = file.path.replace(/\\/g, '/');
        const relativePath = absolutePath.includes('uploads/')
          ? 'uploads/' + absolutePath.split('uploads/')[1]
          : absolutePath;

        vendorData.attachment = {
          path: relativePath,
          filename: file.originalname,
          mimetype: file.mimetype,
          size: file.size
        };
      }

      return vendorData;
    });
    project.financialReview.attachments = attachments;

    project.financialReview.selectedProducts = selectedProducts || [];
    project.financialReview.requestedAmount = parsedVendors.reduce((sum, v) => sum + (Number(v.amount) || 0), 0);
    project.financialReview.requestedAt = new Date();

    // Keep workflow at step 2 until financial approval
    if (project.workflowStep < 2) {
      project.workflowStep = 2;
    }

    await project.logActivity(
      `Financial review requested. Reason: ${reason}. Total requested: $${project.financialReview.requestedAmount}`,
      managerId,
      { financialReviewRequested: true }
    );

    // Create audit event
    await AuditEvent.create({
      actorId: managerId,
      action: 'REQUEST_FINANCIAL_REVIEW',
      targetType: 'Project',
      targetId: project._id,
      metadata: { reason, requestedAmount: project.financialReview.requestedAmount }
    });

    await project.save();

    console.log(`[${new Date().toISOString()}] Financial review requested successfully for project ${project.uniqueId} (ID: ${project._id})`);

    res.status(200).json({
      success: true,
      message: 'Financial review requested successfully',
      data: project.financialReview
    });
  } catch (error) {
    console.error('requestFinancialReview error:', error);
    res.status(500).json({ success: false, message: 'Server error requesting financial review' });
  }
};

// NEW: Request Purchase (Service Manager)
const requestPurchase = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      reason,
      software,
      consumable,
      kits,
      others,
      vendors
    } = req.body;

    const managerId = req.user.id;

    console.log(`[${new Date().toISOString()}] Purchase request for project ${id} by manager ${managerId}`);

    // Validation
    if (typeof reason !== 'string' || reason.trim().length < 10) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a detailed reason (min 10 chars)'
      });
    }

    const project = await Project.findById(id);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    // Process files
    let attachments = [];
    if (req.files && req.files.length > 0) {
      const totalSize = req.files.reduce((acc, f) => acc + (f.size || 0), 0);
      const storageCheck = await checkStorageLimit(req.user.id, totalSize);
      if (!storageCheck.allowed) {
        safeUnlinkMultiple(req.files);
        return res.status(400).json({ success: false, message: `Storage limit exceeded. Remaining: ${storageCheck.remainingMB} MB.` });
      }

      attachments = req.files.map(file => {
        const absolutePath = file.path.replace(/\\/g, '/');
        const relativePath = absolutePath.includes('uploads/')
          ? 'uploads/' + absolutePath.split('uploads/')[1]
          : absolutePath;

        return {
          path: relativePath,
          filename: file.originalname,
          mimetype: file.mimetype,
          size: file.size
        };
      });
      // Register in Drive
      await registerFilesToDrive(req.user.id, req.files, 'Project', project._id);
    }

    // Parse vendors
    let parsedVendors = [];
    if (vendors) {
      try {
        parsedVendors = typeof vendors === 'string' ? JSON.parse(vendors) : vendors;
      } catch (e) {
        console.error('Error parsing vendors:', e);
      }
    }

    // Update purchaseDetails or a new field? 
    // The user said "create new page like 'Request Financial Review'", 
    // so I should probably store it in a similar structure.
    // Let's add it to purchaseDetails if it fits, or create a new field in model.
    // For now, I'll update purchaseDetails to include the request info.

    if (!project.purchaseDetails) project.purchaseDetails = {};

    project.purchaseDetails.requested = true;
    project.purchaseDetails.requestReason = reason;
    project.purchaseDetails.software = software;
    project.purchaseDetails.consumable = consumable;
    project.purchaseDetails.kits = kits;
    project.purchaseDetails.others = others;
    project.purchaseDetails.vendors = parsedVendors.map(v => {
      const vendorData = {
        details: v.details,
        amount: Number(v.amount) || 0
      };
      if (typeof v.attachmentIndex === 'number' && v.attachmentIndex >= 0 && req.files && req.files[v.attachmentIndex]) {
        const file = req.files[v.attachmentIndex];
        const absolutePath = file.path.replace(/\\/g, '/');
        const relativePath = absolutePath.includes('uploads/')
          ? 'uploads/' + absolutePath.split('uploads/')[1]
          : absolutePath;

        vendorData.attachment = {
          path: relativePath,
          filename: file.originalname,
          mimetype: file.mimetype,
          size: file.size
        };
      }
      return vendorData;
    });
    project.purchaseDetails.attachments = attachments;
    project.purchaseDetails.requestedAt = new Date();
    project.purchaseDetails.requestedBy = managerId;
    project.purchaseDetails.status = 'Order Placing'; // Initial status

    await project.logActivity(
      `Purchase request initiated. Reason: ${reason}.`,
      managerId,
      { purchaseInitiated: true }
    );

    await project.save();

    res.status(200).json({
      success: true,
      message: 'Purchase request submitted successfully',
      data: project.purchaseDetails
    });
  } catch (error) {
    console.error('requestPurchase error:', error);
    res.status(500).json({ success: false, message: 'Server error requesting purchase' });
  }
};

// NEW: Approve/Adjust Financial Amount (Financial Manager)
const approveFinancialReview = async (req, res) => {
  try {
    const { id } = req.params;
    const { action, approvedAmount, remarks } = req.body;
    const financialManagerId = req.user.id;

    console.log(`[${new Date().toISOString()}] Financial review ${action} for project ${id} by manager ${financialManagerId} `);

    // Validation
    if (!['Approved', 'Rejected'].includes(action)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid action. Must be "Approved" or "Rejected"'
      });
    }

    const project = await Project.findById(id);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    // Check if review exists (relaxed check: check status or requested flag)
    if (!project.financialReview || (!project.financialReview.requested && project.financialReview.status === 'Pending')) {
      // Allow if status is Pending even if requested flag is missing (migration safety)
      if (project.financialReview?.status !== 'Pending') {
        return res.status(400).json({
          success: false,
          message: 'No pending financial review for this project'
        });
      }
    }

    if (project.financialReview.status !== 'Pending') {
      return res.status(400).json({
        success: false,
        message: `Financial review already ${project.financialReview.status.toLowerCase()} `
      });
    }

    // Update financial review status
    project.financialReview.status = action;
    project.financialReview.reviewedBy = financialManagerId;
    project.financialReview.reviewedAt = new Date();
    project.financialReview.remarks = remarks || '';

    if (action === 'Approved') {
      // Update project amount if financial manager adjusted it
      if (approvedAmount && approvedAmount > 0) {
        project.quotedAmount = approvedAmount;
        project.financialReview.approvedAmount = approvedAmount;
      } else {
        // Keep current amount or default to 0
        project.financialReview.approvedAmount = project.quotedAmount || project.financialReview.requestedAmount || 0;
      }

      // Advance workflow to step 3 (ready for TL assignment)
      project.workflowStep = 3;

      await project.logActivity(
        `Financial review approved. Amount: $${Number(project.financialReview.approvedAmount || 0).toLocaleString()}${approvedAmount && approvedAmount !== project.financialReview.requestedAmount ? ' (adjusted)' : ''}`,
        financialManagerId,
        {
          financialApproved: true,
          approvedAmount: project.financialReview.approvedAmount,
          originalAmount: project.financialReview.requestedAmount
        }
      );
    } else {
      // Rejected - stay at workflow step 2
      await project.logActivity(
        `Financial review rejected: ${remarks || 'No reason provided'} `,
        financialManagerId,
        { financialRejected: true }
      );
    }

    project.markModified('financialReview');
    await project.save();

    // Create audit event
    await AuditEvent.create({
      actorId: financialManagerId,
      action: `FINANCIAL_REVIEW_${(typeof action === 'string' ? action : String(action)).toUpperCase()} `,
      targetType: 'Project',
      targetId: project._id,
      metadata: {
        approvedAmount: project.financialReview.approvedAmount,
        remarks,
        originalAmount: project.financialReview.requestedAmount
      }
    });

    console.log(`[${new Date().toISOString()}] Financial review ${action} for project ${project.uniqueId}`);

    res.status(200).json({
      success: true,
      message: `Financial review ${(typeof action === 'string' ? action : String(action)).toLowerCase()} successfully`,
      data: { project }
    });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error approving financial review: `, error);
    res.status(500).json({
      success: false,
      message: 'Server error processing financial review'
    });
  }
};

// NEW: Get Projects Pending Financial Review (for Financial Manager Dashboard)
const getFinancialReviewProjects = async (req, res) => {
  try {
    // STRICT QUERY: Must be explicitly requested
    const query = {
      'financialReview.requested': true
      // REMOVED: 'financialReview.status': 'Pending' - allow all statuses (Approved/Rejected) for dashboard history
    };

    console.log(`[${new Date().toISOString()}] Fetching financial reviews with query: `, JSON.stringify(query));

    const projects = await Project.find(query)
      .populate('userId', 'name email uniqueId department')
      .populate('financialReview.requestedBy', 'name email uniqueId role service')
      .populate('assignedTo', 'name email uniqueId')
      .sort({ 'financialReview.requestedAt': -1 });

    console.log(`[${new Date().toISOString()}] Found ${projects.length} projects pending financial review`);

    res.status(200).json({
      success: true,
      data: projects,
      count: projects.length
    });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error fetching financial review projects: `, error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching financial review projects'
    });
  }
};

// NEW: Get All Project Payments (for Financial Manager to see paid amounts across all services)
const getAllProjectPayments = async (req, res) => {
  try {
    const { department } = req.query;

    // Query projects that have either a quote or a payment status beyond Pending
    const query = {
      $or: [
        { paymentStatus: { $ne: 'Pending' } },
        { quotedAmount: { $exists: true, $gt: 0 } },
        { 'paymentDetails.amount': { $exists: true, $gt: 0 } }
      ]
    };

    // Filter by department if provided (for separated services view)
    if (department) {
      query.department = department;
    }

    console.log(`[${new Date().toISOString()}] Fetching all project payments. Filter: ${department || 'All'}`);

    const projects = await Project.find(query)
      .populate('userId', 'name email uniqueId department')
      .populate('assignedTo', 'name email uniqueId')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: projects,
      count: projects.length
    });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error fetching all project payments:`, error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching project payments'
    });
  }
};

// NEW: Get HR Escalations (Projects with escalated reports)
const getHREscalatedProjects = async (req, res) => {
  try {
    const userDept = (req.user.department || '').toLowerCase();

    // Strict HR Manager Access Check (as per user request: "manager... can alone access it")
    const isHRManager = req.user.role === 'manager' && (userDept.includes('human resources') || userDept.includes('hr') || userDept.includes('human-resource'));
    if (!isHRManager) {
      return res.status(403).json({ success: false, message: 'Access denied: HR Manager only' });
    }


    // Filter projects by the specified 6 services (+ any variation)
    // NGS, Drug Discovery, Software Development, Microbiology, Biochemistry, Molecular Biology
    const validServicesRegex = /ngs|drug.*discovery|software.*develop|micro.*biology|biochem|molec.*biol|modecular.*biol/i;

    console.log(`[HR Escalations] Request from User: ${req.user.name} (${req.user._id})`);

    // Log all unique depts to debug why regex might fail
    const allDepts = await Project.distinct('department');
    console.log(`[HR Escalations] All unique departments in DB: ${JSON.stringify(allDepts)}`);
    console.log(`[HR Escalations] Validating against Regex: ${validServicesRegex}`);

    // Find projects from allowed services containing escalated reports
    const projects = await Project.find({
      department: { $regex: validServicesRegex },
      'reports': {
        $elemMatch: { status: { $in: ['Escalated to HR', 'Accepted by HR'] } }
      }
    })
      .populate('userId', 'name email uniqueId department')
      .populate('assignedTo', 'name email uniqueId')
      .populate('reports.submittedBy', 'name email role')
      .populate({
        path: 'messages.senderId',
        select: 'name email role department service uniqueId'
      });

    console.log(`[HR Escalations] DB Query found ${projects.length} projects.`);

    // 2. ALSO Fetch Direct Chat Escalations (Conversations)
    // These are conversations created via 'sendMessageToHR' without a projectId.
    // They are identified by contextStrings or naming covention.
    const conversations = await Conversation.find({
      name: { $regex: /^HR Escalation:/i }
    })
      .populate('members.userId', 'name email role department service uniqueId');

    // Transform Conversations into "Project-like" objects for consistency
    const conversationProjects = await Promise.all(conversations.map(async conv => {
      // Fetch messages for this conversation manualy since it is not embedded
      const messages = await Message.find({ conversationId: conv._id })
        .populate('senderId', 'name email role department service uniqueId')
        .sort({ createdAt: 1 });

      // Identify the Service Manager (the non-HR member usually, or the one who sent messages)
      let serviceManager = conv.members.find(m => m.userId && (m.userId.role === 'manager' || m.userId.role === 'tl') && !(m.userId.department || '').match(/human|hr/i))?.userId;

      // Fallback: If no service manager found in members, check message senders
      if (!serviceManager && messages.length > 0) {
        const potentialSender = messages.find(m => m.senderId && (m.senderId.role === 'manager' || m.senderId.role === 'tl') && !(m.senderId.department || '').match(/human|hr/i));
        if (potentialSender) {
          serviceManager = potentialSender.senderId;
        }
      }

      const managerName = serviceManager?.name || 'Service Manager';
      // Use service field first, then department
      const managerDept = serviceManager?.service || serviceManager?.department || 'Unknown Service';

      // Determine latest activity
      const latestMsg = messages.length > 0 ? messages[messages.length - 1] : null;
      const lastActivity = latestMsg ? new Date(latestMsg.timestamp || latestMsg.createdAt) : new Date(conv.createdAt);

      let status = conv.status || 'Escalated to HR';
      if (status === 'active') status = 'Escalated to HR';

      return {
        _id: conv._id, // Use conversation ID
        uniqueId: `CHAT-${conv._id.toString().substring(18)}`, // Fake ID
        department: managerDept,
        category: 'Direct Escalation (Chat)',
        status: status,
        userId: serviceManager || { name: managerName, email: 'N/A' }, // "Owner"
        assignedTo: [], // HR Managers are effectively assigned
        reports: [{
          status: status,
          title: 'Direct Chat Escalation',
          content: latestMsg?.content || 'No messages yet',
          submittedBy: serviceManager,
          escalatedAt: lastActivity,
          createdAt: lastActivity,
          _id: conv._id // distinct ID
        }],
        messages: messages.map(m => ({
          ...m.toObject(),
          senderId: m.senderId
        })),
        isConversation: true // Flag for frontend if needed
      };
    }));

    // Merge Real Projects and Conversation Pseudo-Projects
    const allItems = [...projects, ...conversationProjects];

    const sortedProjects = allItems.sort((a, b) => {
      const getLatestEscalation = (p) => {
        const escReports = p.reports.filter(r => ['Escalated to HR', 'Accepted by HR'].includes(r.status));
        if (!escReports.length) return 0;
        return Math.max(...escReports.map(r => new Date(r.escalatedAt || r.createdAt || 0).getTime()));
      };
      return getLatestEscalation(b) - getLatestEscalation(a);
    });

    res.status(200).json({
      success: true,
      data: sortedProjects,
      count: sortedProjects.length
    });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error fetching HR escalations: `, error);
    res.status(500).json({ success: false, message: 'Server error fetching escalations' });
  }
};

// NEW: Send message from Service Manager to HR Manager
const sendMessageToHR = async (req, res) => {
  try {
    const { subject, message, projectId } = req.body;
    const managerId = req.user.id;

    console.log(`[${new Date().toISOString()}] Service Manager ${managerId} sending message to HR`);

    // Validation
    if (typeof subject !== 'string' || typeof message !== 'string' || subject.trim().length === 0 || message.trim().length < 10) {
      return res.status(400).json({
        success: false,
        message: 'Subject and message (min 10 chars) are required and must be strings'
      });
    }

    // UPDATE: Auto-escalate project if projectId is present
    if (projectId) {
      try {
        const project = await Project.findById(projectId);
        if (project) {
          // 1. Add Report (Triggers Dashboard Visibility)
          if (!project.reports) project.reports = [];
          project.reports.push({
            title: subject,
            content: message,
            type: 'Issue',
            status: 'Escalated to HR',
            submittedBy: managerId,
            escalatedAt: new Date(),
            managerRemarks: 'Escalated via Message to HR'
          });

          // 2. Add to Messages (History)
          if (!project.messages) project.messages = [];
          project.messages.push({
            senderId: managerId,
            content: `**[ESCALATED TO HR] ${subject}**\n${message}`
          });

          await project.save();
          console.log(`[${new Date().toISOString()}] Project ${project.uniqueId} escalated via Message to HR`);

          // Notify HR via Socket.io
          const io = req.app.get('io');
          if (io) {
            io.emit('hrEscalationUpdate', { projectId: project._id, action: 'message_escalation' });
          }
        }
      } catch (escError) {
        console.error('Error auto-escalating project:', escError);
      }
    }

    const manager = await User.findById(managerId).select('name email uniqueId service department role');

    // Find HR Manager(s)
    const hrManagers = await User.find({
      role: 'manager',
      isActive: true,
      $or: [
        { department: { $regex: /human\s*resources/i } },
        { department: { $regex: /^hr$/i } },
        { service: { $regex: /human\s*resources/i } }
      ]
    }).select('_id name email uniqueId service department');

    if (hrManagers.length === 0) {
      console.warn(`[${new Date().toISOString()}] No HR Manager found.`);
      return res.status(404).json({
        success: false,
        message: 'No HR Manager found to receive this message.'
      });
    }

    const hrManager = hrManagers[0];
    console.log(`[${new Date().toISOString()}] Found HR Manager: ${hrManager.name} `);

    // Create Audit Event
    await AuditEvent.create({
      actorId: managerId,
      action: 'MANAGER_ESCALATE_TO_HR',
      targetType: 'User',
      targetId: hrManager._id,
      metadata: {
        subject,
        messagePreview: (typeof message === 'string' ? message : '').substring(0, 100),
        projectId: projectId || null
      }
    });

    // Chat Integration: Group Conversation (Send to ALL HR Managers)
    try {
      // Find or create a group conversation for this manager interacting with HR
      let conversation = await Conversation.findOne({
        type: 'group',
        contextStringType: 'Escalation',
        contextStringValue: 'HR',
        'members.userId': managerId
      });

      if (!conversation) {
        // Create new conversation
        const memberIds = [managerId, ...hrManagers.map(m => m._id.toString())];
        const uniqueIds = [...new Set(memberIds)];

        conversation = new Conversation({
          type: 'group',
          name: `HR Escalation: ${manager.name}`,
          description: 'Channel for escalating issues to HR',
          contextStringType: 'Escalation',
          contextStringValue: 'HR',
          createdBy: managerId,
          members: uniqueIds.map(uid => ({ userId: uid, role: 'member' }))
        });
        await conversation.save();
      } else {
        // Ensure all current HR managers are members
        const currentMemberIds = conversation.members.map(m => m.userId.toString());
        let updated = false;
        hrManagers.forEach(m => {
          if (!currentMemberIds.includes(m._id.toString())) {
            conversation.members.push({ userId: m._id, role: 'admin' });
            updated = true;
          }
        });
        if (updated) await conversation.save();
      }

      const newMessage = new Message({
        conversationId: conversation._id,
        senderId: managerId,
        content: `**[ESCALATION] ${subject}**\n\n${message}${projectId ? `\n\n_Related to Project: ${projectId}_` : ''}`,
        contentType: 'text',
        metadata: {
          subject,
          projectId: projectId || null,
          isEscalation: true
        }
      });
      await newMessage.save();

      await Conversation.findByIdAndUpdate(conversation._id, {
        lastMessage: newMessage._id,
        lastMessageAt: new Date()
      });

      // Socket Emission
      const io = req.app.get('io');
      if (io) {
        io.to(`conversation_${conversation._id}`).emit('newMessage', newMessage);
      }

    } catch (chatError) {
      console.error('Chat creation error during HR escalation:', chatError);
    }

    res.status(200).json({
      success: true,
      message: `Escalation message sent to ${hrManagers.length} HR Manager(s) successfully.`,
      data: { managersNotified: hrManagers.length }
    });

  } catch (error) {
    console.error('Error sending message to HR:', error);
    res.status(500).json({ success: false, message: 'Server error sending message to HR' });
  }
};

// --- Brand Purchase Workflow Functions (Financial Manager -> Financial Employee) ---

const initiateBrandPurchase = async (req, res) => {
  try {
    const { id } = req.params;
    const { productName, amountSent, assignedEmployeeId, description, quantity } = req.body;

    const project = await Project.findById(id);
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

    project.purchaseDetails = {
      productName,
      amountSent,
      assignedEmployee: assignedEmployeeId,
      status: 'Order Placing',
      description,
      quantity,
      updatedAt: new Date()
    };

    if (project.logActivity) {
      await project.logActivity(`Brand purchase initiated for ${productName} ($${amountSent})`, req.user._id, {
        statusChange: 'Order Placing',
        visibility: 'Internal'
      });
    }

    await project.save();

    res.status(200).json({ success: true, message: 'Purchase initiated and assigned to employee', data: project });
  } catch (error) {
    console.error('initiateBrandPurchase error:', error);
    res.status(500).json({ success: false, message: 'Error initiating purchase' });
  }
};

const generatePurchaseBill = async (req, res) => {
  try {
    const { id } = req.params;
    const { billNumber, totalAmount, remainingAmount, receivedQuantity, quality, verified, action } = req.body;
    const file = req.file;

    const project = await Project.findById(id);
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

    // Prepare bill form update
    const billUpdate = {
      billNumber,
      totalAmount: Number(totalAmount),
      remainingAmount: Number(remainingAmount),
      receivedQuantity: Number(receivedQuantity),
      quality,
      verified: verified === 'true',
      saved: true,
      generatedAt: new Date(),
      generatedBy: req.user._id
    };

    if (file) {
      const absolutePath = file.path.replace(/\\/g, '/');
      const relativePath = absolutePath.includes('uploads/')
        ? 'uploads/' + absolutePath.split('uploads/')[1]
        : absolutePath;
      billUpdate.billImage = relativePath;

      // Register in Drive
      await registerFilesToDrive(req.user.id, [file], 'Project Attachment', project._id);
    } else if (project.purchaseDetails.billForm && project.purchaseDetails.billForm.billImage) {
      billUpdate.billImage = project.purchaseDetails.billForm.billImage;
    }

    // Merge with existing billForm data to prevent data loss
    const existingBillForm = project.purchaseDetails.billForm ? project.purchaseDetails.billForm.toObject() : {};
    project.purchaseDetails.billForm = { ...existingBillForm, ...billUpdate };

    // Handle Action
    if (action === 'complete') {
      project.purchaseDetails.billForm.generated = true;
      project.purchaseDetails.status = 'Going to send';

      if (project.logActivity) {
        await project.logActivity(`Bill completed for ${project.purchaseDetails.productName}. Bill: ${billNumber}`, req.user._id, {
          statusChange: 'Going to send',
          visibility: 'Internal'
        });
      }
    } else {
      // Save Draft
      project.purchaseDetails.billForm.generated = false;
    }

    project.purchaseDetails.updatedAt = new Date();
    await project.save();

    res.status(200).json({ success: true, message: `Bill ${action}d successfully`, data: project });
  } catch (error) {
    console.error('generatePurchaseBill error:', error);
    res.status(500).json({ success: false, message: 'Error generating bill' });
  }
};

const completePurchaseDelivery = async (req, res) => {
  try {
    const { id } = req.params;

    const project = await Project.findById(id);
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

    project.purchaseDetails.status = 'Delivered';
    project.purchaseDetails.deliveredAt = new Date();
    project.purchaseDetails.updatedAt = new Date();

    if (project.logActivity) {
      await project.logActivity(`Brand product ${project.purchaseDetails.productName} delivered to Service Manager`, req.user._id, {
        statusChange: 'Delivered',
        visibility: 'Internal'
      });
    }

    await project.save();

    res.status(200).json({ success: true, message: 'Product delivered successfully', data: project });
  } catch (error) {
    console.error('completePurchaseDelivery error:', error);
    res.status(500).json({ success: false, message: 'Error completing delivery' });
  }
};

const getPurchaseProjects = async (req, res) => {
  try {
    let query = {};
    if (req.user.role === 'manager' || req.user.role === 'admin' || req.user.role === 'superadmin') {
      query = { 'purchaseDetails.productName': { $exists: true, $ne: null } };
    } else {
      query = {
        $or: [
          { 'purchaseDetails.assignedEmployee': req.user._id },
          // Unassigned purchases can be viewed by any purchase personnel
          { 'purchaseDetails.assignedEmployee': { $exists: false } },
          { 'purchaseDetails.assignedEmployee': null }
        ],
        'purchaseDetails.productName': { $exists: true, $ne: null }
      };
    }

    const projects = await Project.find(query)
      .populate('userId', 'name email uniqueId department')
      .populate('purchaseDetails.assignedEmployee', 'name email uniqueId')
      .sort({ 'purchaseDetails.updatedAt': -1 });

    res.status(200).json({ success: true, data: projects });
  } catch (error) {
    console.error('getPurchaseProjects error:', error);
    res.status(500).json({ success: false, message: 'Error fetching purchase projects' });
  }
};

// NEW: Add Professional Fee (Order Amount) - Sales Manager only, after Service completion
const addProfessionalFee = async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, vendorName, description } = req.body;

    console.log(`[${new Date().toISOString()}] Add professional fee for project ${id} by user ${req.user.id}`);

    // Check if user is Sales Manager
    const isSales = checkIsSalesManager(req.user);
    if (!isSales && req.user.role !== 'admin' && req.user.role !== 'superadmin') {
      return res.status(403).json({ success: false, message: 'Access denied - Sales Manager role required' });
    }

    // Validate amount
    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({ success: false, message: 'Valid positive amount required' });
    }

    const projectQuery = buildProjectQuery(id);
    const project = await Project.findOne(projectQuery);

    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    // Check if fee already exists
    if (project.professionalFee && project.professionalFee.amount > 0) {
      return res.status(400).json({
        success: false,
        message: 'A professional fee is already assigned to this project. Please use the "Update" feature to modify it.'
      });
    }

    // Add professional fee
    project.professionalFee = {
      amount: Number(amount.toFixed(2)),
      vendorName: (typeof vendorName === 'string' ? vendorName : '').trim(),
      description: (typeof description === 'string' ? description : '').trim(),
      addedBy: req.user.id,
      addedAt: new Date(),
      updatedAt: new Date()
    };

    await project.save();
    await project.logActivity(
      `Professional fee added: ₹${amount.toLocaleString()}${vendorName ? ` (Vendor: ${vendorName})` : ''}`,
      req.user.id,
      { visibility: 'Internal' }
    );

    await project.populate('userId professionalFee.addedBy', 'name email uniqueId');

    console.log(`[${new Date().toISOString()}] Professional fee added for ${project.uniqueId}`);

    res.status(200).json({
      success: true,
      data: project,
      message: 'Professional fee added successfully'
    });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error adding professional fee:`, error);
    res.status(500).json({ success: false, message: 'Server error adding professional fee' });
  }
};

// NEW: Update Professional Fee - Sales Manager only
const updateProfessionalFee = async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, vendorName, description } = req.body;

    console.log(`[${new Date().toISOString()}] Update professional fee for project ${id}`);

    const isSales = checkIsSalesManager(req.user);
    if (!isSales && req.user.role !== 'admin' && req.user.role !== 'superadmin') {
      return res.status(403).json({ success: false, message: 'Access denied - Sales Manager role required' });
    }

    if (amount !== undefined && (typeof amount !== 'number' || amount < 0)) {
      return res.status(400).json({ success: false, message: 'Amount must be a non-negative number' });
    }

    const projectQuery = buildProjectQuery(id);
    const project = await Project.findOne(projectQuery);

    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    if (!project.professionalFee || !project.professionalFee.amount) {
      return res.status(400).json({
        success: false,
        message: 'No professional fee exists to update. Please add one first.'
      });
    }

    // Update fields
    if (amount !== undefined) project.professionalFee.amount = Number(amount.toFixed(2));
    if (vendorName !== undefined) project.professionalFee.vendorName = (typeof vendorName === 'string' ? vendorName : String(vendorName || '')).trim();
    if (description !== undefined) project.professionalFee.description = (typeof description === 'string' ? description : String(description || '')).trim();
    project.professionalFee.updatedAt = new Date();

    await project.save();
    await project.logActivity(
      `Professional fee updated: ₹${project.professionalFee.amount.toLocaleString()}`,
      req.user.id,
      { visibility: 'Internal' }
    );

    await project.populate('userId professionalFee.addedBy', 'name email uniqueId');

    res.status(200).json({
      success: true,
      data: project,
      message: 'Professional fee updated successfully'
    });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error updating professional fee:`, error);
    res.status(500).json({ success: false, message: 'Server error updating professional fee' });
  }
};

// NEW: addProjectAttachments (Allow project owner or assigned staff to add documents)
const addProjectAttachments = async (req, res) => {
  try {
    const { id } = req.params;
    const project = await Project.findById(id);
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

    // Permissions: Project owner, SalesManager, or assigned team member
    const isOwner = project.userId.toString() === req.user.id;
    const isAssigned = project.assignedTo && project.assignedTo.some(id => id.toString() === req.user.id);
    const isSales = req.user.role === 'SalesManager' || req.user.role === 'Admin' || req.user.role === 'Superadmin' || req.user.role === 'admin' || req.user.role === 'superadmin';

    if (!isOwner && !isAssigned && !isSales) {
      return res.status(403).json({ success: false, message: 'Unauthorized to add attachments to this project' });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, message: 'No files uploaded' });
    }

    const newAttachments = req.files.map(file => {
      const absolutePath = file.path.replace(/\\/g, '/');
      const relativePath = absolutePath.includes('uploads/')
        ? 'uploads/' + absolutePath.split('uploads/')[1]
        : absolutePath;

      return {
        path: relativePath,
        filename: file.originalname,
        mimetype: file.mimetype,
        size: file.size
      };
    });

    project.attachments = [...(project.attachments || []), ...newAttachments];

    // NEW: Register project files in Drive model for unified tracking
    const targetUserId = !isOwner ? project.userId : null;
    await registerFilesToDrive(req.user.id, req.files, 'Project Attachment', project._id, targetUserId);

    await project.save();

    await project.logActivity(`Uploaded ${newAttachments.length} additional document(s)`, req.user.id, {
      visibility: 'External',
      attachments: newAttachments
    });

    res.status(200).json({
      success: true,
      data: project.attachments,
      message: 'Documents uploaded successfully'
    });
  } catch (error) {
    console.error('Error adding project attachments:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = {
  createProject,
  getMyProjects,
  updateProject,
  assignProjectToDepartmentManager,
  getUnassignedProjects,
  getAssignedProjects,
  getProject,
  getFormConfig,
  startTask,
  updateProgress,
  pushProgress,
  completeProject,
  getDrugDiscoveryManagers,
  getSalesManagerActivities,
  getSalesAllAssignedProjects,
  getProjectMessages,
  sendProjectMessage,
  submitProject,
  quoteAmount,
  createPaymentForm,
  submitPayment,
  submitBalancePayment,
  approvePayment,
  generateReceipt,
  reviewProjectByServiceManager,
  reviewProjectByFinancial,
  reviewProjectByHR,
  assignToTeamLead,
  assignTeamMembers,
  submitEmployeeReport,
  reviewReportByManager,
  hrHiringAction,
  getProjectsForApproval,
  getHREscalatedProjects,
  getDrugDiscoveryTLs,
  getDrugDiscoveryEmployees,
  sendMessageToManager,
  requestFinancialReview,
  requestPurchase, // NEW
  approveFinancialReview,
  getFinancialReviewProjects,
  getAllProjectPayments, // Added missing export
  sendMessageToHR,
  sendPaymentWarning,
  toggleProjectHold,
  initiateBrandPurchase,
  generatePurchaseBill,
  completePurchaseDelivery,
  getPurchaseProjects,
  addProfessionalFee,        // NEW
  updateProfessionalFee,       // NEW
  addProjectAttachments,
  updateReceipt              // NEW: SalesManager can update receipt items
};

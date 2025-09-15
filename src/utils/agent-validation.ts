export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  score: number;
}

export interface ResearchValidationCriteria {
  requiredFields: string[];
  minimumSources: number;
  minimumQueries: number;
  minimumWordCount: number;
  forbiddenPhrases: string[];
}

export interface AnalysisValidationCriteria {
  requiredSections: string[];
  minimumWordCount: number;
  mustIncludeTokens: boolean;
  requiredElements: string[];
}

export function validateResearchOutput(
  output: string,
  criteria: ResearchValidationCriteria = {
    requiredFields: ['search_queries_used', 'top_findings', 'sources', 'scraped_excerpt'],
    minimumSources: 2,
    minimumQueries: 3,
    minimumWordCount: 200,
    forbiddenPhrases: [
      'I lack real-time access',
      'I cannot perform',
      'based on publicly available information',
      'consult current financial news',
      'My analysis would be based on'
    ]
  }
): ValidationResult {
  const result: ValidationResult = {
    isValid: true,
    errors: [],
    warnings: [],
    score: 100
  };

  const lowerOutput = output.toLowerCase();
  for (const phrase of criteria.forbiddenPhrases) {
    if (lowerOutput.includes(phrase.toLowerCase())) {
      result.errors.push(`Contains forbidden generic phrase: "${phrase}"`);
      result.score -= 30;
    }
  }

  let parsedOutput: any;
  try {
    const cleanedOutput = output.trim().replace(/^```(json)?/i, '').replace(/```$/i, '').trim();
    parsedOutput = JSON.parse(cleanedOutput);
  } catch (error) {
    result.errors.push('Output is not valid JSON format');
    result.score -= 40;
    result.isValid = false;
    return result;
  }

  // Handle the new research data structure with nested web_search, market_data, content_scraping
  let searchData = parsedOutput;
  if (parsedOutput.web_search) {
    searchData = parsedOutput.web_search;
  }

  // Check for required fields in the web_search section
  for (const field of criteria.requiredFields) {
    let found = false;
    
    if (field === 'search_queries_used' && searchData.search_queries_used) {
      found = true;
    } else if (field === 'top_findings' && searchData.top_findings) {
      found = true;
    } else if (field === 'sources' && searchData.sources) {
      found = true;
    } else if (field === 'scraped_excerpt') {
      // Check in content_scraping section
      if (parsedOutput.content_scraping?.scraped_excerpt) {
        found = true;
      }
    }
    
    if (!found) {
      result.errors.push(`Missing required field: ${field}`);
      result.score -= 15;
    }
  }

  if (searchData.search_queries_used) {
    if (!Array.isArray(searchData.search_queries_used)) {
      result.errors.push('search_queries_used must be an array');
      result.score -= 10;
    } else if (searchData.search_queries_used.length < criteria.minimumQueries) {
      result.errors.push(`Insufficient search queries: ${searchData.search_queries_used.length} < ${criteria.minimumQueries}`);
      result.score -= 20;
    }
  }

  if (searchData.sources) {
    if (!Array.isArray(searchData.sources)) {
      result.errors.push('sources must be an array');
      result.score -= 10;
    } else if (searchData.sources.length < criteria.minimumSources) {
      result.errors.push(`Insufficient sources: ${searchData.sources.length} < ${criteria.minimumSources}`);
      result.score -= 15;
    }
  }

  if (searchData.top_findings) {
    const wordCount = searchData.top_findings.split(/\s+/).length;
    if (wordCount < criteria.minimumWordCount) {
      result.warnings.push(`Content may be too brief: ${wordCount} words < ${criteria.minimumWordCount}`);
      result.score -= 10;
    }
  }

  if (parsedOutput.content_scraping?.scraped_excerpt) {
    if (parsedOutput.content_scraping.scraped_excerpt.length < 100) {
      result.warnings.push('Scraped content seems insufficient');
      result.score -= 5;
    }
  }

  result.isValid = result.errors.length === 0 && result.score >= 60;
  return result;
}

export function validateAnalysisOutput(
  output: string,
  requestedTokens: string[] = [],
  criteria: AnalysisValidationCriteria = {
    requiredSections: ['Executive Summary', 'Technical Analysis', 'Outlook'],
    minimumWordCount: 300,
    mustIncludeTokens: true,
    requiredElements: ['price', 'market', 'analysis']
  }
): ValidationResult {
  const result: ValidationResult = {
    isValid: true,
    errors: [],
    warnings: [],
    score: 100
  };

  const lowerOutput = output.toLowerCase();

  const refusalPhrases = [
    'I cannot perform',
    'I am sorry, but I cannot',
    'cannot provide analysis',
    'lacks the necessary functionality'
  ];

  for (const phrase of refusalPhrases) {
    if (lowerOutput.includes(phrase.toLowerCase())) {
      result.errors.push(`Analysis agent refused to analyze: contains "${phrase}"`);
      result.score -= 40;
    }
  }

  const wordCount = output.split(/\s+/).length;
  if (wordCount < criteria.minimumWordCount) {
    result.errors.push(`Analysis too brief: ${wordCount} words < ${criteria.minimumWordCount}`);
    result.score -= 20;
  }

  for (const section of criteria.requiredSections) {
    if (!lowerOutput.includes(section.toLowerCase())) {
      result.warnings.push(`Missing recommended section: ${section}`);
      result.score -= 10;
    }
  }

  if (criteria.mustIncludeTokens && requestedTokens.length > 0) {
    let tokensMentioned = 0;
    for (const token of requestedTokens) {
      if (lowerOutput.includes(token.toLowerCase())) {
        tokensMentioned++;
      }
    }
    
    if (tokensMentioned === 0) {
      result.errors.push('Analysis does not mention any of the requested tokens');
      result.score -= 30;
    } else if (tokensMentioned < requestedTokens.length) {
      result.warnings.push(`Only ${tokensMentioned}/${requestedTokens.length} requested tokens mentioned`);
      result.score -= 10;
    }
  }

  let elementsFound = 0;
  for (const element of criteria.requiredElements) {
    if (lowerOutput.includes(element.toLowerCase())) {
      elementsFound++;
    }
  }

  if (elementsFound < criteria.requiredElements.length / 2) {
    result.warnings.push('Analysis lacks depth - missing key analytical elements');
    result.score -= 15;
  }

  result.isValid = result.errors.length === 0 && result.score >= 50;
  return result;
}

export function extractTokensFromQuery(query: string): string[] {
  const tokens: string[] = [];
  const lowerQuery = query.toLowerCase();
  const tokenPatterns = [
    /\b([a-z]{2,6})\s+token\b/gi,
    /\b([a-z]{2,6})\s+coin\b/gi,
    /\b([a-z]{2,6})\s+protocol\b/gi,
    /\b(bitcoin|btc)\b/gi,
    /\b(ethereum|eth)\b/gi,
    /\b(iq)\s+token\b/gi,
    /\b(pear)\s+protocol\b/gi
  ];

  for (const pattern of tokenPatterns) {
    const matches = query.matchAll(pattern);
    for (const match of matches) {
      if (match[1]) {
        tokens.push(match[1].toUpperCase());
      }
    }
  }

  return [...new Set(tokens)];
}

export function validateAnalysisWorkflow(
  query: string,
  researchOutput: string,
  analysisOutput: string
): ValidationResult {
  const extractedTokens = extractTokensFromQuery(query);
  const researchValidation = validateResearchOutput(researchOutput);
  const analysisValidation = validateAnalysisOutput(analysisOutput, extractedTokens);

  const combinedResult: ValidationResult = {
    isValid: researchValidation.isValid && analysisValidation.isValid,
    errors: [...researchValidation.errors, ...analysisValidation.errors],
    warnings: [...researchValidation.warnings, ...analysisValidation.warnings],
    score: Math.round((researchValidation.score + analysisValidation.score) / 2)
  };

  if (researchValidation.score < 70) {
    combinedResult.warnings.push('Research quality below threshold - may affect analysis quality');
  }

  if (analysisValidation.score < 60) {
    combinedResult.warnings.push('Analysis quality below threshold - consider retry');
  }

  return combinedResult;
}
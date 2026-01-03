const Material = require('../models/Material');
const User = require('../models/User');
const aiConfig = require('../config/aiConfig');

/**
 * AI-Powered Material Search with Weighted Categories
 * POST /api/search/ai
 * 
 * Uses OpenRouter to call AI model (DeepSeek Chat v3) for dynamic category inference.
 * NO hardcoded fallbacks - fully AI-driven.
 */
const aiSearch = async (req, res) => {
  try {
    const { query, latitude, longitude, radius = 50 } = req.body;

    // Validate required fields
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return res.status(400).json({ message: 'Search query is required' });
    }

    // Get user location from authenticated user if not provided
    let userLat = latitude;
    let userLng = longitude;

    if (!userLat || !userLng) {
      const user = await User.findOne({ email: req.user.email });
      if (user && user.location && user.location.coordinates) {
        // MongoDB stores as [lng, lat]
        [userLng, userLat] = user.location.coordinates;
      }
    }

    // Validate location if available
    if (userLat !== undefined && userLng !== undefined) {
      const lat = parseFloat(userLat);
      const lng = parseFloat(userLng);
      
      if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        return res.status(400).json({ message: 'Invalid coordinates' });
      }
    }

    // Validate API key
    const apiKey = aiConfig.getApiKey();
    if (!apiKey) {
      console.error('❌ OPENROUTER_API_KEY or GEMINI_API_KEY is not set in environment variables');
      return res.status(500).json({ 
        message: 'AI search is not configured. Please set OPENROUTER_API_KEY in environment variables.' 
      });
    }

    // Valid database categories (must match Material schema enum exactly)
    const VALID_CATEGORIES = ['Chemicals', 'Glassware', 'Electronics', 'Metals', 'Plastics', 'Bio Materials', 'Other'];
    
    // Category mapping: AI category names -> Database category names
    const categoryMapping = {
      'Glass': 'Glassware',
      'Glassware': 'Glassware',
      'Rubber': 'Other',
      'Wires': 'Electronics',
      'Wire': 'Electronics',
      'Cables': 'Electronics',
      'Cable': 'Electronics',
      'Circuit': 'Electronics',
      'Circuit Board': 'Electronics',
      'PCB': 'Electronics',
      'Sensor': 'Electronics',
      'Sensors': 'Electronics',
      'Metal': 'Metals',
      'Steel': 'Metals',
      'Aluminum': 'Metals',
      'Copper': 'Metals',
      'Plastic': 'Plastics',
      'Polymer': 'Plastics',
      'Chemical': 'Chemicals',
      'Bio': 'Bio Materials',
      'Biomaterial': 'Bio Materials',
      'Biomaterials': 'Bio Materials',
    };

    // System prompt for AI reasoning
    const SYSTEM_PROMPT = `You are an expert sustainability engineer and material science advisor.

Your task is to analyze a project or use case described by a user and infer
what reusable material categories would be required to build it.

You must reason step-by-step internally using:
1. Functional decomposition (what the system must do)
2. Component inference (what physical parts are needed)
3. Material abstraction (what material types those components map to)

Then produce a structured output.

IMPORTANT RULES:
- Do NOT rely on keyword matching.
- Do NOT assume predefined project types.
- Generalize from first principles.
- Consider real-world engineering constraints.
- Prefer reusable and commonly discarded materials.

CRITICAL: You MUST use ONLY these exact category names (case-sensitive):
- "Chemicals"
- "Glassware" (NOT "Glass")
- "Electronics"
- "Metals" (NOT "Metal")
- "Plastics" (NOT "Plastic")
- "Bio Materials" (exact spelling with space)
- "Other"

OUTPUT FORMAT (STRICT):
Return ONLY valid JSON.
No explanations.
No markdown.
No comments.

JSON SCHEMA:
{
  "categories": [
    {
      "name": "<Material Category - MUST be one of the valid categories above>",
      "weight": <number between 0 and 1>,
      "reason": "<1-line justification>"
    }
  ]
}

RULES FOR WEIGHTS:
- Weights must sum to 1.0
- Higher weight = more critical to the project
- Use at least 2 categories
- Maximum 6 categories
- Category names MUST match exactly one of the valid categories listed above`;

    const userQuery = `Given the use case: "${query}"

Return the JSON response now:`;

    // Call OpenRouter API - SINGLE CALL, NO RETRIES
    let aiResponse;
    let categories = [];
    let categoryWeights = {};

    try {
      console.log(`🤖 Calling OpenRouter with model: ${aiConfig.GEMINI_MODEL}`);
      console.log(`🔑 API key preview: ${apiKey.substring(0, Math.min(10, apiKey.length))}... (${apiKey.length} chars)`);
      
      const requestBody = {
        model: aiConfig.GEMINI_MODEL,
        messages: [
          {
            role: 'system',
            content: SYSTEM_PROMPT
          },
          {
            role: 'user',
            content: userQuery
          }
        ],
        ...aiConfig.REQUEST_CONFIG,
      };
      
      console.log(`📤 Request details:`, {
        url: aiConfig.OPENROUTER_API_URL,
        model: requestBody.model,
        messageCount: requestBody.messages.length,
        hasApiKey: !!apiKey
      });
      
      const response = await fetch(aiConfig.OPENROUTER_API_URL, {
        method: 'POST',
        headers: aiConfig.getHeaders(apiKey),
        body: JSON.stringify(requestBody),
      });
      
      console.log(`📥 Response status: ${response.status} ${response.statusText}`);

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}`;
        let errorDetails = null;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error?.message || errorData.message || errorMessage;
          errorDetails = errorData;
        } catch (e) {
          const errorText = await response.text();
          errorMessage = errorText || errorMessage;
        }
        console.error(`❌ OpenRouter API error (${response.status}): ${errorMessage}`);
        console.error('Error details:', JSON.stringify(errorDetails, null, 2));
        
        // Provide more helpful error message to client
        let clientMessage = 'AI inference failed';
        if (response.status === 401) {
          clientMessage = 'AI service authentication failed. Please check API key configuration.';
        } else if (response.status === 404) {
          clientMessage = 'AI model not found. Please check model configuration.';
        } else if (response.status === 429) {
          clientMessage = 'AI service rate limit exceeded. Please try again later.';
        }
        
        return res.status(502).json({ 
          message: clientMessage,
          error: errorMessage,
          statusCode: response.status
        });
      }

      const data = await response.json();
      
      if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        console.error('❌ Invalid response structure from OpenRouter API');
        return res.status(502).json({ 
          message: 'AI inference failed',
          error: 'Invalid response structure from AI service' 
        });
      }

      const aiText = data.choices[0].message.content;
      
      // Parse JSON from response (remove markdown code blocks if present)
      const cleanedText = aiText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      
      // Try to extract JSON if wrapped in other text
      let jsonText = cleanedText;
      const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jsonText = jsonMatch[0];
      }
      
      // Strict JSON parsing
      try {
        aiResponse = JSON.parse(jsonText);
      } catch (parseError) {
        console.error('❌ Failed to parse AI response as JSON:', parseError.message);
        console.error('Raw AI response:', aiText.substring(0, 200));
        return res.status(502).json({ 
          message: 'AI inference failed',
          error: 'AI returned invalid JSON format' 
        });
      }
      
      // Strict validation of AI response structure
      if (!aiResponse || typeof aiResponse !== 'object') {
        console.error('❌ AI response is not an object');
        return res.status(502).json({ 
          message: 'AI inference failed',
          error: 'Invalid AI response structure' 
        });
      }

      if (!aiResponse.categories || !Array.isArray(aiResponse.categories)) {
        console.error('❌ AI response missing categories array');
        return res.status(502).json({ 
          message: 'AI inference failed',
          error: 'AI response missing categories array' 
        });
      }

      if (aiResponse.categories.length === 0) {
        console.error('❌ AI response has empty categories array');
        return res.status(502).json({ 
          message: 'AI inference failed',
          error: 'AI returned no categories' 
        });
      }

      // Validate each category structure
      for (const cat of aiResponse.categories) {
        if (!cat.name || typeof cat.name !== 'string') {
          console.error('❌ Invalid category name:', cat);
          return res.status(502).json({ 
            message: 'AI inference failed',
            error: 'Invalid category structure: missing or invalid name' 
          });
        }
        if (typeof cat.weight !== 'number' || cat.weight < 0 || cat.weight > 1) {
          console.error('❌ Invalid category weight:', cat);
          return res.status(502).json({ 
            message: 'AI inference failed',
            error: 'Invalid category structure: weight must be between 0 and 1' 
          });
        }
        if (!cat.reason || typeof cat.reason !== 'string') {
          console.error('❌ Invalid category reason:', cat);
          return res.status(502).json({ 
            message: 'AI inference failed',
            error: 'Invalid category structure: missing or invalid reason' 
          });
        }
      }

      // Validate and normalize weights
      const totalWeight = aiResponse.categories.reduce((sum, cat) => sum + cat.weight, 0);
      if (totalWeight === 0) {
        console.error('❌ All category weights are zero');
        return res.status(502).json({ 
          message: 'AI inference failed',
          error: 'All category weights are zero' 
        });
      }

      // Normalize weights to sum to 1.0 and map categories to database values
      const mappedCategories = [];
      const mappedCategoryWeights = {};
      
      aiResponse.categories.forEach(cat => {
        cat.weight = cat.weight / totalWeight;
        
        // Map AI category name to database category name
        let dbCategory = cat.name;
        if (categoryMapping[cat.name]) {
          dbCategory = categoryMapping[cat.name];
          console.log(`🔄 Mapped AI category "${cat.name}" -> "${dbCategory}"`);
        }
        
        // Only include if it's a valid database category
        if (VALID_CATEGORIES.includes(dbCategory)) {
          if (!mappedCategories.includes(dbCategory)) {
            mappedCategories.push(dbCategory);
          }
          // Accumulate weights if same category appears multiple times
          if (mappedCategoryWeights[dbCategory]) {
            mappedCategoryWeights[dbCategory] += cat.weight;
          } else {
            mappedCategoryWeights[dbCategory] = cat.weight;
          }
        } else {
          console.warn(`⚠️ AI category "${cat.name}" (mapped to "${dbCategory}") is not a valid database category. Using "Other" instead.`);
          // Fallback to "Other" for invalid categories
          if (!mappedCategories.includes('Other')) {
            mappedCategories.push('Other');
          }
          if (mappedCategoryWeights['Other']) {
            mappedCategoryWeights['Other'] += cat.weight;
          } else {
            mappedCategoryWeights['Other'] = cat.weight;
          }
        }
      });
      
      // Normalize weights again after mapping (in case of duplicates)
      const totalMappedWeight = Object.values(mappedCategoryWeights).reduce((sum, w) => sum + w, 0);
      if (totalMappedWeight > 0) {
        Object.keys(mappedCategoryWeights).forEach(cat => {
          mappedCategoryWeights[cat] = mappedCategoryWeights[cat] / totalMappedWeight;
        });
      }
      
      categories = mappedCategories;
      categoryWeights = mappedCategoryWeights;

      console.log(`✅ AI inferred ${categories.length} categories with weights:`, categoryWeights);
      
    } catch (aiError) {
      console.error('❌ AI inference error:', aiError);
      console.error('Error name:', aiError.name);
      console.error('Error message:', aiError.message);
      if (aiError.stack) {
        console.error('Error stack:', aiError.stack);
      }
      
      // Provide more context in error response
      let errorMessage = aiError.message || 'Unknown AI service error';
      let clientMessage = 'AI inference failed';
      
      if (aiError.message?.includes('fetch') || aiError.name === 'TypeError') {
        errorMessage = 'Failed to connect to AI service. Please check network connectivity.';
        clientMessage = 'Network error connecting to AI service';
      } else if (aiError.message?.includes('401') || aiError.message?.includes('authentication')) {
        errorMessage = 'AI service authentication failed. Please check API key.';
        clientMessage = 'AI service authentication failed';
      } else if (aiError.message?.includes('404') || aiError.message?.includes('not found')) {
        errorMessage = 'AI model not found. Please check model configuration.';
        clientMessage = 'AI model not found';
      }
      
      return res.status(502).json({ 
        message: clientMessage,
        error: errorMessage,
        details: aiError.message
      });
    }

    // Build MongoDB query - use categories from AI ONLY (no hardcoded fallbacks)
    const materialQuery = {
      category: { $in: categories },
      status: 'available',
    };

    console.log(`🔍 Searching for materials with categories:`, categories);
    console.log(`📋 Material query:`, JSON.stringify(materialQuery, null, 2));

    let materials;
    const maxDistance = radius * 1000; // Convert km to meters

    // If location provided, use geospatial query with weighted ranking
    if (userLat !== undefined && userLng !== undefined && userLat !== 0 && userLng !== 0) {
      const lat = parseFloat(userLat);
      const lng = parseFloat(userLng);
      const searchRadius = parseFloat(radius);

      // Build category weight mapping for MongoDB aggregation
      const categoryWeightBranches = Object.keys(categoryWeights).map(cat => ({
        case: { $eq: ['$category', cat] },
        then: categoryWeights[cat]
      }));

      // Use aggregation pipeline for geospatial search with weighted ranking
      materials = await Material.aggregate([
        {
          $geoNear: {
            near: {
              type: 'Point',
              coordinates: [lng, lat], // MongoDB uses [lng, lat]
            },
            distanceField: 'distance',
            maxDistance: searchRadius * 1000, // Convert km to meters
            spherical: true,
            query: materialQuery,
          },
        },
        {
          $lookup: {
            from: 'users',
            localField: 'providerId',
            foreignField: '_id',
            as: 'provider',
          },
        },
        {
          $unwind: {
            path: '$provider',
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $addFields: {
            providerRating: { $ifNull: ['$provider.averageRating', 0] },
            distanceKm: { $divide: ['$distance', 1000] }, // Convert to km
            categoryWeight: {
              $switch: {
                branches: categoryWeightBranches,
                default: 0
              }
            },
          },
        },
        {
          $addFields: {
            // Normalize distance score (0-1, where 0 = farthest, 1 = nearest)
            distanceScore: {
              $cond: [
                { $lte: ['$distance', maxDistance] },
                { $subtract: [1, { $divide: ['$distance', maxDistance] }] },
                0
              ]
            },
            // Normalize provider rating (0-1, where 0 = 0 stars, 1 = 5 stars)
            providerRatingScore: { $divide: ['$providerRating', 5] },
          },
        },
        {
          $addFields: {
            // Calculate final ranking score
            // score = (categoryWeight × 0.5) + (distanceScore × 0.3) + (providerRatingScore × 0.2)
            finalScore: {
              $add: [
                { $multiply: ['$categoryWeight', 0.5] },
                { $multiply: ['$distanceScore', 0.3] },
                { $multiply: ['$providerRatingScore', 0.2] }
              ]
            },
          },
        },
        {
          $sort: {
            finalScore: -1, // Highest score first
            distance: 1, // Then by distance
          },
        },
        {
          $limit: 50, // Limit results
        },
      ]);

      // Format results with ranking scores
      materials = materials.map((material) => ({
        id: material._id.toString(),
        title: material.title,
        category: material.category,
        description: material.description,
        quantity: material.quantity,
        price: material.price,
        priceUnit: material.priceUnit,
        images: material.images,
        providerId: material.providerId?.toString() || material.provider?._id?.toString(),
        provider: {
          name: material.provider?.name || 'Unknown',
          email: material.provider?.email || '',
          organization: material.provider?.organization || '',
          averageRating: material.providerRating || 0,
          totalReviews: material.provider?.totalReviews || 0,
        },
        location: material.location,
        status: material.status,
        distance: material.distanceKm, // Distance in km
        relevanceScore: material.finalScore || 0, // AI-calculated relevance score
        createdAt: material.createdAt,
      }));
    } else {
      // No location provided, calculate scores without distance component
      materials = await Material.find(materialQuery)
        .populate('providerId', 'name email organization averageRating totalReviews')
        .limit(50);

      // Calculate scores for non-geospatial results
      materials = materials.map((material) => {
        const catWeight = categoryWeights[material.category] || 0;
        const providerRatingScore = (material.providerId.averageRating || 0) / 5;
        // score = (categoryWeight × 0.5) + (providerRatingScore × 0.2)
        // No distance component when location not available
        const finalScore = (catWeight * 0.5) + (providerRatingScore * 0.2);

        return {
          id: material._id.toString(),
          title: material.title,
          category: material.category,
          description: material.description,
          quantity: material.quantity,
          price: material.price,
          priceUnit: material.priceUnit,
          images: material.images,
          providerId: material.providerId._id.toString(),
          provider: {
            name: material.providerId.name,
            email: material.providerId.email,
            organization: material.providerId.organization,
            averageRating: material.providerId.averageRating || 0,
            totalReviews: material.providerId.totalReviews || 0,
          },
          location: material.location,
          status: material.status,
          relevanceScore: finalScore,
          createdAt: material.createdAt,
        };
      });

      // Sort by relevance score
      materials.sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));
    }

    console.log(`✅ Found ${materials.length} materials matching AI categories`);
    if (materials.length > 0) {
      console.log(`📦 Sample material categories:`, materials.slice(0, 5).map(m => m.category));
    } else {
      console.log(`⚠️ No materials found. Available categories in DB might differ from AI categories.`);
      console.log(`💡 AI inferred categories:`, categories);
      console.log(`💡 Valid DB categories:`, VALID_CATEGORIES);
    }

    // Return response with AI analysis
    res.json({
      query,
      categories: aiResponse.categories, // Full AI response with weights and reasons
      materials,
      count: materials.length,
      aiAnalysis: aiResponse, // Full AI response for explainability
    });
  } catch (error) {
    console.error('AI search error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  aiSearch,
};

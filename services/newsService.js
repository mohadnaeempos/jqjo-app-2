// services/newsService.js
export const incrementViews = async (articleId) => {
  try {
    console.log(`Incrementing views for article ${articleId}`);
    
    // Try this common REST API pattern first
    // const response = await fetch(`https://jqjo.com/api/news/${articleId}`, {
    //   method: 'PATCH',  // or 'PUT' depending on your API
    //   headers: {
    //     'Content-Type': 'application/json',
    //   },
    //   body: JSON.stringify({
    //     views: 1  // Or whatever increment your API expects
    //   })
    // });

    // Alternative if your API has a specific increment endpoint
     const response = await fetch(`https://jqjo.com/api/news-detail/${articleId}`, {
       method: 'POST',
       headers: {
         'Content-Type': 'application/json',
       }
     });

    console.log('Response status:', response.status);
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('API Error:', errorData);
      throw new Error(errorData.message || 'Failed to increment views');
    }

    return await response.json();
  } catch (error) {
    console.error('Network Error:', error);
    throw error;
  }
};
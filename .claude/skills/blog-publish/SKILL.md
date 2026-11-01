# Blog Publish

When a new blog article is created, we need to make sure our meta data is up-to-date.  This includes the following:

* Updating our sitemap.xml file to include the new article.

## Updating Sitemap.xml

for an article to be included in the sitemap.xml file, it must be added to the list of articles in the sitemap.  This is done by adding a new entry for the article in the sitemap.xml file.  The entry should include the following information:

* The URL of the article: `<loc>{article_url}</loc>`
* The date the article was published: `<lastmod>{publish_date}</lastmod>`
This file contains all the documentation for Upload-Post API.

Upload-Post API: Your API Solution for Social Media

Simplify your social media content management with our powerful API. Upload videos and images to multiple platforms with a single integration.

Below you will find the complete documentation, exported for AI processing.

--- START OF docs/api/current-user.md ---

Current User API

Verify the validity of your API key and retrieve basic account information.

Authentication

Get Current User

Validates your API key and returns the associated email and subscription plan.

Endpoint

Headers

| Name          | Required | Description                |
|---------------|----------|----------------------------|
| Authorization | Yes      | ApiKey YOUR\_API\_KEY      |

Example Request (curl)

Success Response (200 OK)

Response Fields:

| Field   | Type    | Description                                                        |
|---------|---------|--------------------------------------------------------------------|
| success | Boolean | Always true for successful requests                              |
| message | String  | Confirmation message                                               |
| email   | String  | The email address associated with the authenticated account        |
| plan    | String  | Current subscription plan (e.g., Basic, Professional, Business, Default) |

Error Responses

401 Unauthorized - Invalid or missing authentication

500 Internal Server Error - Server-side error

Use Cases

Token Validation: Verify that your API key or JWT is still valid before making other API calls

Plan Check: Determine the current subscription plan to understand available features and limits

Account Verification: Confirm which account is associated with your credentials

--- END OF docs/api/current-user.md ---


--- START OF docs/api/ffmpeg-editor.md ---

FFmpeg Editor API

Process and transform media using your own FFmpeg command safely on our infrastructure. Submit a job with your media and a command template, then poll the job until it finishes and download the result.

Endpoint

Headers

| Name          | Value                    | Description                      |
|---------------|--------------------------|----------------------------------|
| Authorization | Apikey your-api-key-here | Your API key for authentication. |

Parameters

| Name              | Type          | Required | Description |
|-------------------|---------------|----------|-------------|
| file              | File (binary) | Yes      | Media file to process. |
| full\_command      | String        | Yes      | FFmpeg command template that MUST use {input} and {output} placeholders. Example: ffmpeg -y -i {input} -c:v libx264 -crf 23 {output} |
| output\_extension  | String        | Yes      | Desired output file extension (e.g., mp4, wav, mp3, mov, webm). |

Note: If the duration of the input media cannot be detected, the system assumes 60 seconds for quota calculation.

Command Template Rules

For security and reliability, only safe FFmpeg commands are accepted.

Use placeholders: {input} (or indexed {input0}, {input1}, â€¦) for input files and {output} for the output file; do not hardcode filenames. The first input can be referenced as {input} or {input0}.

Allowed pattern starts with ffmpeg and may include typical flags (e.g., -y, -i, -c:v, -c:a, -r, -b:v, filters, etc.).

Blocked characters/constructs to prevent command injection: ;, |, &, $, \\\`\`, $(, newlines, carriage returns, and destructive commands like rm/rmdir\`.

If validation fails, the API returns 400 Bad Request with a helpful message.

Responses

202 Accepted (job created)

Check Job Status

Poll the job until it finishes.

Example response:

Statuses: PENDING, PROCESSING, FINISHED, ERROR.

Download Result

When status is FINISHED, download the processed file.

Response headers include the appropriate Content-Type and a Content-Disposition attachment filename (e.g., output.mp4, output.wav). The response body is the binary media.

Example: Convert to MP4 (H.264)

Example: Extract Audio to WAV

Concatenate/Merge multiple videos (NEW)

The API now supports multiple input files for operations like concatenation. You can use placeholders {input0}, {input1}, {input2}, etc., in full\_command.

Option A: Send multiple URLs (JSON endpoint)

Option B: Upload multiple files (multipart/form-data)

Concatenation examples

Simple concatenation (2 videos):

Concatenation with re-encoding (multiple videos):

Using the concat demuxer (no re-encoding â€” faster but requires identical formats):

First create a text file with the list of videos, upload it as file and the videos as file1, file2, etc.:

Important: The {input} placeholder still works as before (points to the first file). For multiple inputs, use {input0}, {input1}, {input2}, etc.

Limitation: The predefined presets (h264\_social, hevc\_social, copy\_mux) and ffmpeg\_args only support a single file. For multiple inputs, you must use full\_command.

Quotas by Plan (minutes of media/month)

| Plan          | Minutes/Month |
|---------------|----------------|
| free          | 30             |
| basic         | 300            |
| professional  | 1000           |
| advanced      | 3000           |
| business      | 10000          |

Resets on the 1st of each month at 00:00 UTC.

Errors

400 Bad Request: Invalid or unsafe FFmpeg command, missing parameters.

401 Unauthorized: Invalid or expired API key.

404 Not Found: Job not found.

429 Too Many Requests: Monthly quota exceeded (response includes current usage when applicable).

500 Internal Server Error: Processing error.

Notes

Jobs are asynchronous; always poll the job status before attempting to download the output.

Quota checks use detected media duration to ensure fair usage across plans.

--- END OF docs/api/ffmpeg-editor.md ---


--- START OF docs/api/get-analytics.md ---

GET /api/analytics/profile\_username

Retrieves analytics data for a specified user profile across one or more social media platforms.

Method: GET

Endpoint URL: https://api.upload-post.com/api/analytics/profile\_username

Description:

This endpoint provides key analytics metrics for a given social media profile associated with a user's account. It allows fetching data for multiple platforms in a single request. The system is designed to be extensible, with support for more platforms planned for the future.

Authentication:

A valid JSON Web Token (JWT) is required for authentication. The token must be included in the Authorization header as a Apikey token.

Authorization: Apikey \<YOUR\_JWT\_TOKEN>

Parameters:

| Parameter          | Type   | Location      | Required | Description                                                                                             |
| ------------------ | ------ | ------------- | -------- | ------------------------------------------------------------------------------------------------------- |
| profile\_username | string | Path          | Yes      | The unique username of the profile for which you want to retrieve analytics.                            |
| platforms        | string | Query         | Yes      | A comma-separated list of platforms to fetch analytics for. E.g., ?platforms=instagram,youtube,threads,pinterest,reddit. |
| page\_id          | string | Query         | No       | Required for Facebook analytics. The ID of the Facebook Page.                                           |
| page\_urn         | string | Query         | No       | Optional for LinkedIn. Defaults to "me" (personal profile). Use Organization URN/ID for pages.          |

Supported Platforms:

Currently, the following platforms are supported:

instagram

tiktok

Linkedin

Facebook

X (Twitter)

youtube

threads

pinterest

reddit

bluesky

Support for additional platforms will be added in the future. If you request a platform that is not yet supported, the response will include a message indicating this for that specific platform.

Here is an example of how to call the endpoint to get analytics for the test profile on Instagram, YouTube, Threads, Pinterest, and Reddit.

Example Successful Response (200 OK):

The response is a JSON object where each key corresponds to a requested platform. The value is another object containing the specific analytics data for that platform.

Field Descriptions for Instagram Analytics:

followers: Total number of followers.

impressions: Total number of times the profile's content was shown to users.

profileViews: Total number of times the profile was viewed.

reach: The number of unique accounts that have seen any of the profile's content.

reach\_timeseries: An array of objects showing the daily reach value over the last 30 days.

Error Responses:

400 Bad Request: The platforms query parameter is missing or invalid.

401 Unauthorized: The JWT is missing, invalid, or expired.

404 Not Found: The specified profile\_username does not exist for the authenticated user.

500 Internal Server Error: An unexpected error occurred on the server while fetching the data.

--- END OF docs/api/get-analytics.md ---


--- START OF docs/api/get-facebook-pages.md ---

This endpoint is crucial for uploads, as it provides you with the necessary ID to specify which Facebook Page you want to send your content to.

Get Facebook Pages

This endpoint allows you to get a list of all Facebook pages a user has access to through their connected accounts. This is a necessary step if you want to post to a specific page, as you will need its ID.

Method: GET

Endpoint: /api/uploadposts/facebook/pages

Authentication:

API Key in the Authorization header.

Authorization: Apikey \<YOUR\_API\_KEY>

Query Parameters:

| Parameter | Type   | Description                                                                                                                                                             | Required |
| :-------- | :----- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :--- |
| profile | string | Optional. The profile's username. If provided, the API will return only the Facebook pages associated with the Facebook account linked to that profile. | No   |

Successful Response (200 OK)

The response will include a list of objects, where each object represents a Facebook page.

Additional Notes:

To post on a Facebook page, you must pass the page id in the facebook\_page\_id parameter of the upload endpoint (/api/upload or /api/upload\_photos).

--- END OF docs/api/get-facebook-pages.md ---


--- START OF docs/api/get-linkedin-pages.md ---

This endpoint is crucial for uploads, as it provides you with the necessary ID to specify which LinkedIn Page you want to send your content to.

Get LinkedIn Pages

Retrieves a list of LinkedIn company pages associated with the authenticated user's account(s).

Method: GET

Endpoint: /api/uploadposts/linkedin/pages

Authentication:

Type: Apikey Token

Header: Authorization: Apikey \<YOUR\_TOKEN>

Query Parameters:

| Parameter | Type   | Description                                                                                                                                                             | Required |
| :-------- | :----- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :--- |
| profile | string | Optional. The username of a specific profile. If provided, the endpoint will return only the LinkedIn pages associated with the LinkedIn account linked to that profile. If omitted, it will return pages from all LinkedIn accounts connected to the user. | No   |

Successful Response (200 OK)

A JSON object containing a list of the user's LinkedIn pages.

Field Descriptions:

id: The unique identifier (URN) for the LinkedIn organization. This is the value you should use when specifying a target\_linkedin\_page\_id in other API calls.

name: The display name of the LinkedIn page.

picture: The URL of the page's logo. Can be null.

account\_id: The internal identifier for the user's connected LinkedIn account in the Upload-Post system.

vanityName: The custom "vanity" URL of the page (e.g., the part that comes after linkedin.com/company/). Can be null.

Error Responses:

401 Unauthorized: If the Authorization header is missing or the token is invalid.

404 Not Found:

If the user associated with the token is not found.

If a profile username is provided but not found for that user.

If no LinkedIn accounts are connected to the user or the specified profile.

If no LinkedIn pages are found for the connected accounts.

500 Internal Server Error: If there's an issue communicating with the LinkedIn API or an unexpected server error occurs.

--- END OF docs/api/get-linkedin-pages.md ---


--- START OF docs/api/get-pinterest-boards.md ---

This endpoint is crucial for uploads, as it provides you with the necessary ID to specify which Pinterest Board you want to send your content to.

Get Pinterest Boards

This endpoint allows you to get a list of all boards (public and secret) from a connected Pinterest account. You will need a board ID to post a Pin to it.

Method: GET

Endpoint: /api/uploadposts/pinterest/boards

Authentication:

API Key in the Authorization header.

Authorization: Apikey \<YOUR\_API\_KEY>

Query Parameters:

| Parameter | Type   | Description                                                                                                                                                             | Required |
| :-------- | :----- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :--- |
| profile | string | Optional. The profile's username. If provided, the API will return only the boards from the Pinterest account linked to that specific profile.                 | No       |

Successful Response (200 OK)

The response will include a list of objects, where each object represents a Pinterest board.

Additional Notes:

To post a Pin, you must pass the board id in the pinterest\_board\_id parameter of the upload endpoint (/api/upload or /api/upload\_photos).

If a profile is not specified, the API will use the first Pinterest account it finds connected to the user. The response will tell you which account was used in the pinterest\_account\_used field.

--- END OF docs/api/get-pinterest-boards.md ---


--- START OF docs/api/get-reddit-detailed-posts.md ---

GET /api/uploadposts/reddit/detailed-posts/

Retrieves detailed posts from a Reddit account connected to a profile, including complete media information (images, galleries, and videos).

Method: GET

Endpoint URL: https://api.upload-post.com/api/uploadposts/reddit/detailed-posts/

Authentication:

A valid JSON Web Token (JWT) is required for authentication. The token must be included in the Authorization header as a Bearer token.

Authorization: Bearer \<YOUR\_JWT\_TOKEN>

Query Parameters:

| Parameter          | Type   | Required | Description                                                      |
| ------------------ | ------ | -------- | ---------------------------------------------------------------- |
| profile\_username | string | Yes      | Username of the profile that has the Reddit account connected.   |

Example Request:

Example Successful Response (200 OK):

Response Fields:

| Field         | Type     | Description                                                   |
| ------------- | -------- | ------------------------------------------------------------- |
| id          | string   | Unique identifier of the Reddit post.                         |
| title       | string   | Title of the post.                                            |
| subreddit   | string   | Name of the subreddit where the post was published.           |
| body        | string   | Content of the post or URL if it's a link post.               |
| likes       | integer  | Number of upvotes on the post.                                |
| comments    | integer  | Number of comments on the post.                               |
| impressions | integer  | Number of views (uses view\_count if available, otherwise score). |
| has\_image   | boolean  | Indicates if the post contains images.                        |
| has\_video   | boolean  | Indicates if the post contains video.                         |
| media       | array    | Array of media objects attached to the post.                  |
| url         | string   | Direct URL to the post on Reddit.                             |
| created\_at  | string   | ISO 8601 timestamp of when the post was created.              |
| thumbnail   | string   | URL of the post's thumbnail image.                            |

Media Types:

| Type             | Description                      | Additional Fields               |
| ---------------- | -------------------------------- | ------------------------------- |
| image          | Individual or gallery image      | width, height               |
| video          | Video hosted on Reddit           | width, height, duration   |
| external\_video | External video (YouTube, etc.)   | thumbnail, provider         |

Error Responses:

| Code | Message                                              | Description                                      |
| ---- | ---------------------------------------------------- | ------------------------------------------------ |
| 400  | Query parameter "profile\_username" is required.   | The required parameter is missing.               |
| 400  | Profile 'X' has no Reddit account connected.      | The profile does not have a linked Reddit account. |
| 400  | Reddit account 'X' not found.                     | The Reddit account does not exist for the user.  |
| 500  | An internal server error occurred.                | Internal server error.                           |

Notes:

Supports automatic pagination, fetching up to 2000 posts (20 pages Ã— 100 posts).

Gallery posts include all images in the media array.

Image URLs are already unescaped (no \&amp;).

impressions uses view\_count if available, otherwise uses score as a fallback.

--- END OF docs/api/get-reddit-detailed-posts.md ---


--- START OF docs/api/overview.md ---

Upload-Post API Overview

Upload-Post provides a simple and powerful API for uploading content to TikTok, Instagram, Bluesky, LinkedIn, YouTube, Facebook, X (Twitter), Threads, Pinterest, and Reddit. This documentation will help you get started with our API and make the most of our services.

Getting Started

Create an account at upload-post.com

Connect your TikTok, Instagram, Bluesky, LinkedIn, YouTube, Facebook, X (Twitter), Threads, Pinterest, and Reddit accounts

Generate your API key from the dashboard

Start making API calls

Authentication

All API requests require authentication using an API key. Include your API key in the request header:

Rate Limits

Free tier: 10 uploads per month

Additional uploads available through paid plans

Base URL

All API endpoints are available at:

For detailed information about each endpoint, check out our API Reference.

--- END OF docs/api/overview.md ---


--- START OF docs/api/photo-requirements.md ---

Photo Format Requirements

This document outlines the photo format requirements for uploading to various social media platforms via the API. For platforms where specific requirements are not listed, standard image formats like JPEG and PNG are generally accepted. However, for the most accurate and up-to-date information, please consult the official documentation of each respective platform.

Threads Photo Requirements

Format: JPEG, PNG

File Size: 8 MB maximum

Aspect Ratio: Limit: 10:1 (e.g., can be from 1:10 to 10:1)

Width:

Minimum: 320px (images narrower than 320px will be scaled up to 320px)

Maximum: 1440px (images wider than 1440px will be scaled down to 1440px)

Color Space: sRGB (images with other color spaces will be converted to sRGB)

Instagram Photo Requirements

Media Type: The API supports "IMAGE" for feed posts and "STORIES".

General Guidance: Instagram supports: png, jpeg, gif formats.

For detailed specifications (resolution, aspect ratio, file size), please refer to the official Instagram documentation.

TikTok Photo Requirements

While the API allows photo uploads to TikTok (e.g., for slideshows with auto\_add\_music), specific format requirements (resolution, aspect ratio, file size) are not detailed in the provided source.

General Guidance: Only image formats: JPG, JPEG, or WEBP are compatible.

Please refer to the official TikTok documentation for specific photo guidelines.

Facebook Photo Requirements

General Guidance: Facebook supports various image formats, including JPEG, PNG, GIF, and WebP.

The API upload-photo.md documentation notes that the description is applied only to the first photo uploaded.

For detailed specifications, please refer to the official Facebook documentation.

X (Twitter) Photo Requirements

General Guidance: X (Twitter) supports JPEG, PNG, and GIF formats.

The API upload-photo.md notes no additional parameters are supported for photo uploads to X via this API.

For detailed specifications (e.g., file size limits, dimensions), please refer to the official X/Twitter documentation.

LinkedIn Photo Requirements

General Guidance: LinkedIn supports JPEG, PNG, and GIF formats.

The API upload-photo.md common parameters apply. The caption is used as post commentary.

For detailed specifications, please refer to the official LinkedIn documentation.

Pinterest Photo Requirements

Max Image Size: 20 MB

Supported Formats: BMP, JPEG, PNG, TIFF, GIF, Animated GIF, WEBP

Recommended Size: 1000 x 1500 px

Aspect Ratio: 2:3

Minimum Size: 600 x 900 px

Maximum Size: 2000 x 3000 px

Content-Type: A valid media Content-Type such as image/jpeg, image/png, or image/webp returned by the hosting provider

Image Carousel:

Up to five carousel images

Images must be the same dimension

Reddit Photo Requirements

Max Image Size: 10 MB

Supported Formats: JPG, PNG, GIF, WEBP

Bluesky Photo Requirements

Max Images: 4 per post

Max File Size: 1 MB per image

Supported Formats: JPEG, PNG, GIF, WEBP

Alt Text: Supported and recommended

Daily Limit: 50 uploads per day (combined photos and videos)

Note: The information for Instagram, TikTok, Facebook, X (Twitter), and LinkedIn photo requirements above is general. The provided source code focused primarily on video specifications and Threads image specifications. Always check the official platform guidelines for the latest and most precise requirements.

--- END OF docs/api/photo-requirements.md ---


--- START OF docs/api/reference.md ---

API Reference

The Upload-Post API provides comprehensive endpoints for content management across multiple social media platforms. All endpoints require authentication via API key in the Authorization header.

Core Upload APIs

Video Upload API

Upload videos to TikTok, Instagram, LinkedIn, YouTube, Facebook, X (Twitter), Threads, Pinterest, and Bluesky. Supports both synchronous and asynchronous uploads with scheduling capabilities.

Endpoint: POST /api/upload\_videos

Supported Platforms: TikTok, Instagram, LinkedIn, YouTube, Facebook, X (Twitter), Threads, Pinterest, Bluesky

Photo Upload API

Upload photos and image carousels to LinkedIn, Facebook, X (Twitter), Instagram, TikTok, Threads, Pinterest, and Bluesky. Perfect for visual content distribution across platforms.

Endpoint: POST /api/upload\_photos

Supported Platforms: LinkedIn, Facebook, X (Twitter), Instagram, TikTok, Threads, Pinterest, Bluesky

Text Upload API

Create and distribute text-only posts across social platforms. Ideal for announcements, updates, and text-based content.

Endpoint: POST /api/upload\_text

Supported Platforms: X (Twitter), LinkedIn, Facebook, Threads, Reddit, Bluesky

Upload Management APIs

Upload Status

Track the progress and results of asynchronous uploads initiated with async\_upload=true or scheduled posts. Essential for monitoring long-running upload operations and checking scheduled post execution status.

Endpoint: GET /api/uploadposts/status

Parameters: request\_id (for async uploads) or job\_id (for scheduled posts)

Use Case: Check status of background uploads and scheduled posts, get detailed results per platform

Upload History

Retrieve a paginated history of all your past uploads across platforms. Includes detailed metadata, success/failure status, and platform-specific information.

Endpoint: GET /api/uploadposts/history

Features: Pagination, filtering, comprehensive upload metadata

Schedule Management

Schedule posts for future publication across supported platforms. Manage your content calendar programmatically.

Endpoint: Various scheduling endpoints

Supported Platforms: X (Twitter), LinkedIn, Facebook, Instagram, TikTok, Bluesky, Threads, Pinterest, YouTube

Platform Integration APIs

Analytics API

Retrieve detailed analytics and performance metrics for your social media profiles across connected platforms.

Endpoint: GET /api/analytics/{profile\_username}

Supported Platforms: Instagram, TikTok, LinkedIn, Facebook, X (Twitter)

Metrics: Followers, impressions, reach, profile views, time-series data

Get Facebook Pages

Retrieve all Facebook pages accessible through connected accounts. Required for posting to specific Facebook pages.

Endpoint: GET /api/uploadposts/facebook/pages

Returns: Page IDs, names, profile pictures, account associations

Get LinkedIn Pages

Fetch LinkedIn company pages associated with your connected accounts. Essential for business page posting.

Endpoint: GET /api/uploadposts/linkedin/pages

Returns: Organization URNs, company names, vanity URLs, page logos

Get Pinterest Boards

List all Pinterest boards (public and secret) from connected accounts. Required for targeting specific boards when pinning content.

Endpoint: GET /api/uploadposts/pinterest/boards

Returns: Board IDs, names, associated Pinterest accounts

User Management APIs

User Profiles API

Manage user profiles and generate JWTs for linking social accounts when integrating Upload-Post into your own platform. Essential for white-label integrations and multi-user applications.

Endpoints:

POST /api/uploadposts/users - Create user profiles

GET /api/uploadposts/users - Retrieve user profiles

DELETE /api/uploadposts/users - Delete user profiles

POST /api/uploadposts/users/generate-jwt - Generate authentication tokens

POST /api/uploadposts/users/validate-jwt - Validate tokens

See the User Profile Integration Guide for implementation workflow.

Current User API

Validate your API key and retrieve basic account information including email and subscription plan.

Endpoint: GET /api/uploadposts/me

Use Case: API key validation, plan verification, account confirmation

Content Requirements

Photo Requirements

Comprehensive format specifications, file size limits, aspect ratios, and technical requirements for photo uploads across all supported platforms.

Covers: Instagram, TikTok, Facebook, X (Twitter), LinkedIn, Threads, Pinterest, Reddit, Bluesky

Video Requirements

Detailed video format requirements, codec specifications, resolution limits, and encoding guidelines for optimal compatibility across platforms.

Covers: TikTok, Instagram, YouTube, LinkedIn, Facebook, X (Twitter), Threads, Pinterest, Bluesky

Includes: FFmpeg re-encoding solutions for compatibility issues

Getting Started

Authentication: All requests require an API key in the Authorization: Apikey your-api-key-here header

Base URL: https://api.upload-post.com/api

Rate Limits: Free tier includes 10 uploads per month

Content Guidelines: Review platform-specific requirements before uploading

For implementation examples and integration guides, see our SDK Examples and Integration Guides.

--- END OF docs/api/reference.md ---


--- START OF docs/api/schedule-posts.md ---

Manage Scheduled Posts

Schedule your uploads in advance and keep full control over them with our job management endpoints. This page covers how to list and cancel scheduled jobs created via the scheduled\_date parameter.

List Scheduled Posts

| |  |
|---|---|
| Endpoint | GET /api/uploadposts/schedule |
| Authentication | Required. Supply the Apikey in the Authorization header â€” e.g. Authorization: Apikey \<token> |
| Query / Body Params | None. The user is inferred from the access-token. |

Success Response 200 OK

Returns a JSON array where each element is a scheduled-job object:

| Field | Type | Description |
|-------|------|-------------|
| job\_id | string | Unique identifier of the scheduled job. Required to cancel it. |
| scheduled\_date | string | ISO-8601 date/time when the post will go live. Time is in UTC. |
| post\_type | string | One of video, photo, or text. |
| profile\_username | string | Upload-Post profile that will publish the content. |
| title | string | Title/caption of the post. |
| preview\_url | string \\| null | Short-lived signed URL to preview the media (first photo or video). null for text posts. |

Error Responses

| Status | Reason |
|--------|--------|
| 401 Unauthorized | Missing or invalid token. |

Cancel a Scheduled Post

| | |
|---|---|
| Endpoint | DELETE /api/uploadposts/schedule/\<job\_id> |
| Authentication | Required. Same Authorization header as above. |
| URL Param | job\_id â€” ID obtained from the list endpoint. |

Success Response 200 OK

Error Responses

| Status | Body | Condition |
|--------|------|-----------|
| 401 Unauthorized | Â  | Invalid or missing token. |
| 404 Not Found | { "success": false, "error": "Job not found" } | The supplied job\_id does not exist or doesn't belong to the authenticated user. |
| 500 Internal Server Error | Â  | Unexpected failure while cancelling the job or deleting its assets. |

Edit a Scheduled Post

| | |
|---|---|
| Endpoint | PATCH /api/uploadposts/schedule/\<job\_id> |
| Authentication | Required. Same Authorization header as above. |
| URL Param | job\_id â€” ID obtained from the list endpoint. |
| Body | JSON object with one or more of the fields below. |

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| scheduled\_date | string | No | ISO-8601 date/time in UTC (suffix Z allowed). Must be in the future and within 1 year. |
| title | string | No | New post title/caption. |
| caption | string | No | New caption/description. |

Success Response 200 OK

Error Responses

| Status | Body | Condition |
|--------|------|-----------|
| 400 Bad Request | { "success": false, "error": "\<reason>" } | Invalid body; invalid/past date; job not editable; daily limit reached. |
| 401 Unauthorized | Â  | Invalid or missing token. |
| 403 Forbidden | { "success": false, "error": "Forbidden" } | The job does not belong to the authenticated user. |
| 404 Not Found | { "success": false, "error": "Job not found" } | The supplied job\_id does not exist. |
| 500 Internal Server Error | Â  | Unexpected failure while editing the job. |

Example Request

See Also

Using scheduled\_date when uploading content â€“ parameter description.

Upload Video, Upload Photos, Upload Text â€“ endpoints that support scheduling.

Upload Status â€“ Check the execution status of scheduled posts using the job\_id.

--- END OF docs/api/schedule-posts.md ---


--- START OF docs/api/upload-document.md ---

Upload Document

Upload documents (PDF, PPT, PPTX, DOC, DOCX) to LinkedIn as native document posts. Documents are displayed as carousels/viewers on LinkedIn.

Endpoint

Headers

| Name | Value | Description |
|------|-------|-------------|
| Authorization | Apikey your-api-key-here | Your API key for authentication |

Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| user | String | Yes | User identifier (profile name) |
| platform\[] | Array | Yes | Must be \["linkedin"] - only LinkedIn supports document uploads |
| document | File/URL | Yes | The document file to upload (file upload or URL). Supported formats: PDF, PPT, PPTX, DOC, DOCX |
| title | String | Yes | Document title (displayed on the post) |
| description | String | No | Post commentary/text that appears above the document |
| visibility | String | No | Visibility setting: "PUBLIC", "CONNECTIONS", "LOGGED\_IN", or "CONTAINER". Default: "PUBLIC" |
| target\_linkedin\_page\_id | String | No | LinkedIn organization/page ID to post to a company page instead of personal profile |

Document Requirements

| Requirement | Value |
|-------------|-------|
| Supported Formats | PDF, PPT, PPTX, DOC, DOCX |
| Maximum File Size | 100 MB |
| Maximum Pages | 300 pages |

Example Request (File Upload)

Example Request (URL)

Example Request (Company Page)

Success Response

Error Response

How Documents Appear on LinkedIn

When you upload a document:

Native Viewer: LinkedIn displays the document in a native carousel/viewer format

Page Navigation: Users can swipe or click through pages

Preview: LinkedIn generates thumbnail previews for each page

Download: Depending on visibility settings, users may be able to download the document

Platform Limitations

| Platform | Document Support |
|----------|------------------|
| LinkedIn | Yes (native carousel/viewer) |
| Facebook | No |
| Instagram | No |
| TikTok | No |
| X (Twitter) | No |
| YouTube | No |
| Pinterest | No |
| Threads | No |
| Bluesky | No |
| Reddit | No |

Notes

Document processing may take a few seconds on LinkedIn's side before the post becomes fully visible

The document title appears as the post's media title

The description/commentary appears as the post text above the document

For company pages, ensure the authenticated LinkedIn account has admin access to the page

LinkedIn may compress or optimize documents for viewing

Related Endpoints

Upload Video - Upload videos to multiple platforms

Upload Photo - Upload images to multiple platforms

Upload Text - Post text-only content

Get LinkedIn Pages - List available LinkedIn pages for your account

--- END OF docs/api/upload-document.md ---


--- START OF docs/api/upload-history.md ---

Upload History

Retrieve a paginated list of your past uploads across platforms.

Endpoint

Headers

| Name | Value | Description |
|------|-------|-------------|
| Authorization | Apikey your-api-key | Required.|

Query Parameters

| Name | Type | Required | Default | Allowed | Description |
|------|------|----------|---------|---------|-------------|
| page | Integer | No | 1 | >= 1 | Page number |
| limit | Integer | No | 10 | 10, 20, 50, 100 | Page size |

Responses

200 OK

history: array of history items (most recent first)

total: total number of records for the user

page: requested page

limit: requested limit

400 Bad Request: { "error": "Invalid page" } or { "error": "Invalid limit" }

401 Unauthorized: { "success": false, "message": "Invalid or expired token" }

500 Internal Server Error: { "error": "Failed to retrieve upload history", "details": "..." }

History Item Schema

Typical fields (not all fields are guaranteed on every record):

user\_email: string

profile\_username: string

platform: string (e.g., tiktok, instagram, linkedin, youtube, facebook, x, threads, pinterest)

media\_type: string (video | photo | text)

upload\_timestamp: string (ISO-8601)

success: boolean

platform\_post\_id: string | array | null

post\_url: string | null (present when success is true)

error\_message: string | null

media\_size\_bytes: number | null

post\_title: string | null

post\_caption: string | null

is\_async: boolean | null

job\_id: string | null (present when the upload originated from a scheduled job)

dashboard: any | null

video\_was\_transcoded: boolean | null

changes: object | null

prevalidation\_metadata: object | null

request\_id: string | null

request\_total\_platforms: number | null

Note: When you schedule a post, the resulting history items will include job\_id. Use this to correlate the scheduled job with the eventual publish record in history.

Example Request

Example 200 Response (truncated)

See also

Upload Status

Manage Scheduled Posts

Upload Text

Upload Video

Upload Photos

--- END OF docs/api/upload-history.md ---


--- START OF docs/api/upload-photo.md ---

Upload Photos

Upload photos (and mixed media for supported platforms) to various social media platforms using this endpoint.

Endpoint

Headers

| Name          | Value                      | Description                              |
|---------------|----------------------------|------------------------------------------|
| Authorization | Apikey your-api-key-here   | Your API key for authentication          |

Common Parameters

| Name       | Type   | Required | Description                                                                                   |
|------------|--------|----------|-----------------------------------------------------------------------------------------------|
| user       | String | Yes      | User identifier                                                                               |
| platform\[] | Array  | Yes      | Platform(s) to upload to. Supported values: tiktok, instagram, linkedin, facebook, x, threads, pinterest, bluesky |
| photos\[]   | Array  | Yes      | Array of files to upload. Accepts photos (jpg, png, etc.).  Note: You can also include videos (mp4, mov, etc.) ONLY for Instagram and Threads mixed carousels. |
| title      | String | Yes      | Default title/caption of the post                                                                   |
| description    | String | No       | Optional extended text used on TikTok photo descriptions, LinkedIn commentary, Facebook descriptions, Pinterest notes, and Reddit bodies. Ignored elsewhere. |
| scheduled\_date | String (ISO-8601) | No | Optional date/time (ISO-8601) to schedule publishing, e.g., "2024-12-31T23:45:00Z". Must be in the future (â‰¤ 365 days). Omit for immediate upload. |
| timezone | String (IANA) | No | Optional timezone identifier (e.g., "Europe/Madrid", "America/New\_York"). If provided, scheduled\_date is interpreted in this timezone. Defaults to UTC if omitted. See IANA Time Zone Database for valid values. |
| async\_upload  | Boolean | No      | If true, the request returns immediately with a request\_id and processes in the background. See Upload Status. |
| first\_comment | String | No       | Automatically post a first comment after publishing. Supported on Instagram, Facebook, Threads, Bluesky, Reddit, X, and YouTube. On X (Twitter) and Threads, this creates a reply to the main post. For X threads, the comment is posted as a reply to the last tweet in the thread. On YouTube, it posts as a top-level comment on the video. |

Important: If you set async\_upload to false but the upload takes longer than 59 seconds, it will automatically switch to asynchronous processing to avoid timeouts. In that case, use the request\_id with the Upload Status endpoint to check the upload status and result.

Scheduling behavior: When you provide scheduled\_date, the API responds with 202 Accepted and includes a job\_id. That same job\_id will later appear in Upload History to correlate the scheduled job with the publish record. You can also use the job\_id with the Upload Status endpoint to check the execution status of the scheduled post.

Video Support (Mixed Carousels):

Instagram & Threads: You can upload videos in the photos\[] array to create mixed carousels (photos + videos).

All other platforms (Facebook, TikTok, LinkedIn, X, Pinterest): Do NOT upload videos to this endpoint. Use the Upload Video endpoint instead. Uploading videos here for these platforms will result in an error.

Platform-Specific Titles

The title parameter serves as a fallback. To set a custom title for a particular platform, use the optional \[platform]\_title parameter. If provided, it will override the main title for that platform.

Example Optional Parameters:

instagram\_title: "Check out my latest reel on Instagram! #reels"

facebook\_title: "Excited to share this new video with my Facebook friends and family."

tiktok\_title: "New TikTok video just dropped! ðŸ”¥"

linkedin\_title: "A professional insight on the latest industry trends, discussed in this video."

x\_title: "New video out now! ðŸ“¢"

Platform-Specific Parameters

LinkedIn

| Name                    | Type   | Required | Description                                                    | Default     |
|-------------------------|--------|----------|----------------------------------------------------------------|-------------|
| linkedin\_title          | String | No       | Specific title for the LinkedIn post. Fallbacks to title.    | title     |
| linkedin\_description or description | String | No | Sent as the post commentary. If omitted, we reuse title. | title     |
| visibility              | String | No       | Visibility setting for the post (accepted value: "PUBLIC")     | PUBLIC      |
| target\_linkedin\_page\_id | String | No       | LinkedIn page ID to upload photos to an organization         | "107579166" |

Facebook

| Name             | Type   | Required | Description                                                       | Default |
|------------------|--------|----------|-------------------------------------------------------------------|---------|
| facebook\_title   | String | No       | Specific title for the Facebook post. Fallbacks to title.       | title |
| facebook\_page\_id | String | Yes      | Facebook Page ID where the photos will be posted                  | -       |
| facebook\_media\_type | String | No | Type of media ("POSTS" or "STORIES") | "POSTS" |

Note: The caption is applied only to the first photo uploaded. For correct posting on Facebook, ensure the Page is directly associated with your personal profile and not managed through a Business Portfolio.

Note: If facebook\_page\_id is not provided, we will automatically use the user's only connected Page (if exactly one exists). If multiple Pages are connected, the API returns a helpful error with an available\_pages list so you can choose one. Posting to personal Facebook profiles via API is not supported by Meta; only Pages can be posted to.

X (Twitter)

| Name                        | Type    | Required | Description                                                                                                                           | Default     |
|-----------------------------|---------|----------|---------------------------------------------------------------------------------------------------------------------------------------|-------------|
| x\_title                      | String  | No       | Specific title for the tweet. Fallbacks to title.                                                                                   | title     |
| x\_long\_text\_as\_post          | Boolean | No       | When true, publishes long text as a single post. Otherwise, creates a thread.                                                      | false     |
| reply\_settings               | String  | No       | Controls who can reply to the tweet ("following", "mentionedUsers", "subscribers", "verified")                                       | -           |
| geo\_place\_id                 | String  | No       | Place ID for adding geographic location to the tweet                                                                                  | -           |
| nullcast                     | Boolean | No       | Whether to publish without broadcasting (promotional/promoted-only posts)                                                             | false     |
| for\_super\_followers\_only     | Boolean | No       | Tweet exclusive for super followers                                                                                                   | false     |
| community\_id                 | String  | No       | Community ID for posting to specific communities                                                                                      | -           |
| share\_with\_followers         | Boolean | No       | Share community post with followers                                                                                                   | false     |
| direct\_message\_deep\_link     | String  | No       | Link to take the conversation from public timeline to private Direct Message                                                         | -           |
| tagged\_user\_ids              | Array   | No       | Array of user IDs to tag in the photos (max 10 users)                                                                                 | \[]          |
| reply\_to\_id                  | String  | No       | ID of the tweet to reply to. Creates a reply to the specified tweet.                                                                  | -           |
| exclude\_reply\_user\_ids       | Array   | No       | Array of user IDs to exclude from replying to this tweet. Requires reply\_to\_id.                                                    | \[]          |

Note: For Twitter uploads, specify the platform as "x" in the platform\[] array.

The global description field is ignored for X photo uploads.

How X (Twitter) Thread Creation Works (Advanced Logic)

Note: The following describes the default thread creation logic. To override this and post long text as a single post, set the x\_long\_text\_as\_post parameter to true.

The system is engineered to create well-formatted, natural-looking threads on X (formerly Twitter). Instead of simply splitting text at every line break, it intelligently groups paragraphs to create more readable tweets.

Here's the step-by-step logic:

Intelligent Paragraph Grouping (Primary Method):

The function first identifies distinct paragraphs (any text separated by a blank line).
It then combines as many of these paragraphs as possible into a single tweet, filling it up to the 280-character limit without exceeding it. The double newline (\n\n) between combined paragraphs is preserved for formatting.
This results in fewer, more substantial tweets that flow naturally, just as if a person had written them.

Handling Exceptionally Long Paragraphs:

If a single paragraph is, by itself, longer than the 280-character limit, a more granular splitting logic is automatically triggered for that paragraph only:

Split by Line Break: The system first attempts to break the paragraph down by its individual line breaks (\n).

Split by Word: If any of those single lines are still too long, it will split them by words as a final resort.

Media Attachment:

For posts that include photos or videos, all media is attached only to the first tweet of the thread. The subsequent tweets in the thread will be text-only replies.

TikTok

| Name                  | Type    | Required | Description                                                                                 | Default |
|-----------------------|---------|----------|---------------------------------------------------------------------------------------------|---------|
| tiktok\_title          | String  | No       | Specific title for the TikTok post. Fallbacks to title.                                   | title |
| post\_mode             | String  | No      | Controls how the upload is handled. DIRECT\_POST publishes immediately; MEDIA\_UPLOAD sends the media to the TikTok inbox so users can finish editing in-app. | DIRECT\_POST       |
| privacy\_level         | String  | No | Accepted values: PUBLIC\_TO\_EVERYONE, MUTUAL\_FOLLOW\_FRIENDS, FOLLOWER\_OF\_CREATOR, SELF\_ONLY. | PUBLIC\_TO\_EVERYONE |
| auto\_add\_music        | Boolean | No       | Automatically add background music to photos                                                | false   |
| disable\_comment       | Boolean | No       | Disable comments on the post                                                                | false   |
| brand\_content\_toggle | Boolean| No       | Set to true for paid partnerships that promote third-party brands.        | false   |
| brand\_organic\_toggle | Boolean| No       | Set to true when promoting the creator's own business.                    | false   |
| photo\_cover\_index     | Integer | No       | Index (starting at 0) of the photo to use as the cover/thumbnail for the TikTok photo post  | 0       |
| tiktok\_description or description    | String  | No       | For photo posts, used as description inside post\_info. | title   |

Note on Draft Mode (MEDIA\_UPLOAD): When using MEDIA\_UPLOAD mode (Draft), TikTok does not allow setting a title, caption, privacy settings, or other metadata via the API. The video is simply uploaded to your TikTok inbox/drafts, and you must add the title, caption, and settings manually within the TikTok app before publishing.

Instagram

| Name | Type | Required | Description | Default |
|------|------|----------|-------------|---------|
| instagram\_title | String | No       | Specific title for the Instagram post. Fallbacks to title. | title |
| media\_type | String | No | Type of media ("IMAGE" or "STORIES"). Automatically handles CAROUSEL/REELS logic if mixed media is detected. | "IMAGE" |
| collaborators | String | No | Comma-separated list of collaborator usernames. | - |
| user\_tags | String | No | Comma-separated list of users to tag (e.g., "@user1, user2"). | - |
| location\_id | String | No | Instagram location ID. | - |

The global description field is ignored for Instagram uploads (title serves as caption).

Threads

| Name | Type | Required | Description | Default |
|---|---|---|---|---|
| threads\_title | String | No | Specific title for the Threads post. Fallbacks to title. | title |

The global description field is ignored for Threads photo uploads.

Pinterest

| Name                 | Type   | Required | Description                                  | Default |
|----------------------|--------|----------|----------------------------------------------|---------|
| pinterest\_title      | String | No       | Specific title for the Pinterest Pin. Fallbacks to title. | title |
| pinterest\_description or description | String | No | Populates the Pin description. If omitted, we reuse title. | title |
| pinterest\_board\_id   | String | Yes      | Pinterest board ID to publish the photo to.  | -       |
| pinterest\_alt\_text   | String | No       | Alt text for the image.                      | -       |
| pinterest\_link       | String | No       | Destination link for the photo Pin.          | -       |

Bluesky

| Name | Type | Required | Description | Default |
|---|---|---|---|---|
| bluesky\_title | String | No | Specific text for the Bluesky post. Fallbacks to title. | title |

Note: Bluesky supports up to 4 images per post.

Example Requests

Upload Photo and Video to Instagram (Carousel)

Upload Photos to Facebook

Responses

200 OK (synchronous, finished fast)

200 OK (asynchronous/background started or syncâ†’background fallback)

202 Accepted (scheduled)

400 Bad Request

Missing user, platform\[], Pinterest without pinterest\_board\_id, Reddit without subreddit, invalid platforms, invalid scheduled\_date.

401 Unauthorized: { "success": false, "message": "Invalid or expired token" }

403 Forbidden (plan restrictions)

404 Not Found (e.g., user not found)

429 Too Many Requests (monthly limit exceeded; includes current usage)

500 Internal Server Error: { "success": false, "error": "Detailed error message" }

Notes

When async or when sync falls back to background, use GET /api/uploadposts/status?request\_id={request\_id} to poll progress.

Per-platform results may include fields like url, post\_id(s), and platform-specific metadata or error.

--- END OF docs/api/upload-photo.md ---


--- START OF docs/api/upload-status.md ---

Upload Status

Check the status of asynchronous uploads initiated with async\_upload=true or scheduled posts.

Endpoint

Headers

| Name | Value | Description |
|------|-------|-------------|
| Authorization | Apikey your-api-key-here | Your API key for authentication |

Query Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| request\_id | String | Conditional | The request identifier returned by the upload endpoints when async\_upload=true. Use for async uploads. |
| job\_id | String | Conditional | The job identifier returned by scheduled posts. Use for posts with scheduled\_date. |

Note: At least one of request\_id or job\_id must be provided.

Behavior

Async uploads: When you submit an upload request with async\_upload=true, the API returns immediately with a request\_id. Use this to retrieve aggregated progress and results.

Scheduled posts: When you schedule a post with scheduled\_date, the API returns a job\_id. Use this to check the status after the scheduled time.

The status field may be one of:

pending: The request has been accepted but no platform results recorded yet.

in\_progress: Some platform results recorded but not all (or total unknown).

completed: All known work is finished (based on inferred total or recorded items).

Example Request

For async uploads:

For scheduled posts:

Example Response

For async uploads (request\_id):

For scheduled posts (job\_id):

Responses

| Status | Description |
|--------|-------------|
| 200 OK | Success. Response includes request\_id or job\_id depending on which parameter was used. |
| 400 Bad Request | Missing both request\_id and job\_id: {"error":"request\_id or job\_id is required"} |
| 401 Unauthorized | Invalid or expired token |
| 500 Internal Server Error | Server error with details |

Related

Text uploads

Video uploads

Photo uploads

Schedule posts

--- END OF docs/api/upload-status.md ---


--- START OF docs/api/upload-text.md ---

Upload Text

Upload text posts to various social media platforms using this endpoint.

Note: Currently, this endpoint supports X (Twitter), LinkedIn, Facebook, Threads, Reddit, and Bluesky. More platforms will be added in future updates.

Endpoint

Headers

| Name          | Value                      | Description                              |
|---------------|----------------------------|------------------------------------------|
| Authorization | Apikey your-api-key-here   | Your API key for authentication          |

Common Parameters

| Name          | Type   | Required | Description                                                                |
|---------------|--------|----------|----------------------------------------------------------------------------|
| user          | String | Yes      | User identifier                                                            |
| platform\[]    | Array  | Yes      | Platform(s) to upload to. Supported values: linkedin, x, facebook, threads, reddit, bluesky |
| title         | String | Yes      | Default text content for the post.                                         |
| description    | String | No       | Optional extended body used only on Reddit (becomes the post text). Ignored elsewhere. |
| scheduled\_date | String (ISO-8601) | No | Optional date/time (ISO-8601) to schedule publishing, e.g., "2024-12-31T23:45:00Z". Must be in the future (â‰¤ 365 days). Omit for immediate upload. |
| timezone | String (IANA) | No | Optional timezone identifier (e.g., "Europe/Madrid", "America/New\_York"). If provided, scheduled\_date is interpreted in this timezone. Defaults to UTC if omitted. See IANA Time Zone Database for valid values. |
| async\_upload  | Boolean | No      | If true, the request returns immediately with a request\_id and processes in the background. See Upload Status. |
| first\_comment | String | No       | Automatically post a first comment after publishing. Supported on Facebook, Threads, Bluesky, Reddit, X, and YouTube. On X (Twitter) and Threads, this creates a reply to the main post (threading). On YouTube, it posts as a top-level comment. Note: Instagram does not support text-only posts, so this parameter is not applicable for Instagram here. |

Important: If you set async\_upload to false but the upload takes longer than 59 seconds, it will automatically switch to asynchronous processing to avoid timeouts. In that case, use the request\_id with the Upload Status endpoint to check the upload status and result.

Scheduling behavior: When you provide scheduled\_date, the API responds with 202 Accepted and includes a job\_id. That same job\_id will later appear in Upload History to correlate the scheduled job with the publish record. You can also use the job\_id with the Upload Status endpoint to check the execution status of the scheduled post.

This endpoint supports simultaneous text uploads to X (Twitter), LinkedIn, Facebook, Threads, Reddit, and Bluesky.

Platform-Specific Titles

The title parameter serves as a fallback. To set a custom title for a particular platform, use the optional \[platform]\_title parameter. If provided, it will override the main title for that platform.

Example Optional Parameters:

linkedin\_title: "A professional insight on the latest industry trends."

x\_title: "New update out now! ðŸ“¢"

facebook\_title: "Excited to share this with my Facebook friends."

threads\_title: "Just posted something new on Threads!"

Platform-Specific Parameters

LinkedIn

| Name                    | Type   | Required | Description                                                                                                | Default     |
|-------------------------|--------|----------|------------------------------------------------------------------------------------------------------------|-------------|
| linkedin\_title          | String | No       | Specific text for the LinkedIn post. Fallbacks to title.                                                 | title     |
| target\_linkedin\_page\_id | String | No       | LinkedIn page ID to upload text to an organization's page. If not provided, posts to the user's personal profile. |             |

X (Twitter)

| Name                        | Type    | Required | Description                                                                                                                           | Default     |
|-----------------------------|---------|----------|---------------------------------------------------------------------------------------------------------------------------------------|-------------|
| x\_title                     | String  | No       | Specific text for the tweet. Fallbacks to title. If the text is long, it will be split into a thread.                               | title     |
| x\_long\_text\_as\_post         | Boolean | No       | For X Premium users. When true, long text is published as a single post. When false (default), it creates a thread if text is long. | false     |
| reply\_settings              | String  | No       | Controls who can reply to the tweet ("following", "mentionedUsers", "subscribers", "verified")                                       | -           |
| quote\_tweet\_id              | String  | No       | ID of the tweet to quote in a quote tweet. Mutually exclusive with card\_uri, poll\_\*, and direct\_message\_deep\_link.             | -           |
| geo\_place\_id                | String  | No       | Place ID for adding geographic location to the tweet                                                                                  | -           |
| nullcast                    | Boolean | No       | Whether to publish without broadcasting (promotional/promoted-only posts)                                                             | false     |
| for\_super\_followers\_only    | Boolean | No       | Tweet exclusive for super followers                                                                                                   | false     |
| community\_id                | String  | No       | Community ID for posting to specific communities                                                                                      | -           |
| share\_with\_followers        | Boolean | No       | Share community post with followers                                                                                                   | false     |
| direct\_message\_deep\_link    | String  | No       | Link to take the conversation from public timeline to private Direct Message. Mutually exclusive with card\_uri, quote\_tweet\_id, and poll\_\*. | -           |
| card\_uri                    | String  | No       | Card URI for Twitter Cards/ads/promoted content. Mutually exclusive with quote\_tweet\_id, direct\_message\_deep\_link, and poll\_\*. | -           |
| poll\_options                | Array   | No       | Array of poll options (2-4 options, max 25 characters each). Mutually exclusive with card\_uri, quote\_tweet\_id, and direct\_message\_deep\_link. | \[]          |
| poll\_duration               | Integer | No       | Poll duration in minutes (5-10080, i.e., 5 minutes to 7 days)                                                                         | 1440        |
| poll\_reply\_settings         | String  | No       | Who can reply to poll ("following", "mentionedUsers", "subscribers", "verified"). Requires poll\_options.                                          | -           |
| reply\_to\_id                 | String  | No       | ID of the tweet to reply to. Creates a reply to the specified tweet.                                                                                | -           |
| exclude\_reply\_user\_ids      | Array   | No       | Array of user IDs to exclude from replying to this tweet. Requires reply\_to\_id. | \[]          |

Note: For Twitter uploads, specify the platform as "x" in the platform\[] array.

How Twitter Threads Are Created

If your text in the title field is longer than 280 characters, our API automatically creates a Twitter thread. You don't need to do anything special. By default, x\_long\_text\_as\_post is false.

How it works:

Our system creates natural-looking threads by intelligently splitting your text:

It groups paragraphs: The system combines as many paragraphs (text separated by a blank line) as possible into a single tweet without exceeding the character limit.

It splits long paragraphs: If a single paragraph is too long for one tweet, it's split into smaller parts. The system first tries to split by line breaks and then by words.

This process ensures your threads are easy to read.

Example of a thread creation

If you send this text in the title:

The API will create a thread like this:

Tweet 1:

This is the first paragraph. It is short.

This second paragraph is a bit longer. Our API tries to keep paragraphs together in one tweet.

Tweet 2:

This is a much longer third paragraph. It probably won't fit with the others. It might even be too long for a single tweet. If so, the API will split it. It will first look for line breaks.

Tweet 3:

If a single line is still too long, it will split it by words. This creates a readable and well-structured Twitter thread automatically.

Facebook

| Name             | Type   | Required | Description                                                       | Default |
|------------------|--------|----------|-------------------------------------------------------------------|---------|
| facebook\_title   | String | No       | Specific text for the Facebook post. Fallbacks to title.        | title |
| facebook\_page\_id | String | Yes      | Facebook Page ID where the text will be posted.                   | -       |
| facebook\_link\_url | String | No       | Optional URL to include for link preview in text posts. If provided, it's sent as link to the Graph API and Facebook may render a preview card. | -       |

Note: If facebook\_page\_id is not provided, we will automatically use the user's only connected Page (if exactly one exists). If multiple Pages are connected, the API returns a helpful error with an available\_pages list so you can choose one. Posting to personal Facebook profiles via API is not supported by Meta; only Pages can be posted to.

Threads

| Name                        | Type    | Required | Description                                                                                                                              | Default |
|-----------------------------|---------|----------|------------------------------------------------------------------------------------------------------------------------------------------|---------|
| threads\_title             | String  | No       | Specific text for the Threads post. Fallbacks to title.                                                                                | title |
| threads\_long\_text\_as\_post | Boolean | No       | If true, long text is published as a single post. If false (default), a thread is created if the text exceeds 500 characters.        | false |

Note: To upload content to Threads, specify the platform as "threads" in the platform\[] array.

How Threads Are Created

If the text you provide exceeds 500 characters and threads\_long\_text\_as\_post is false, our API will automatically create a thread on Threads, similar to how it works with X (Twitter).

How it works:

Our system creates natural-looking threads by intelligently splitting your text:

It groups paragraphs: The system combines as many paragraphs as possible into a single post without exceeding the character limit.

It splits long paragraphs: If a single paragraph is too long for a post, it is split into smaller parts, first trying to break by line breaks, and if that's not enough, by words.

This process ensures that your Threads are coherent and easy to read, replicating the functionality you already enjoy for X.

Reddit

| Name       | Type   | Required | Description                                                        | Default |
|------------|--------|----------|--------------------------------------------------------------------|---------|
| subreddit  | String | Yes      | Destination subreddit, without r/ (e.g., python).              | -       |
| flair\_id   | String | No       | ID of the flair template to apply to the post.                     | -       |

If you provide the global description field, it becomes the Markdown body of the Reddit post; otherwise we post only the title.

Note: To upload content to Reddit, specify the platform as "reddit" in the platform\[] array.

Bluesky

| Name | Type | Required | Description | Default |
|---|---|---|---|---|
| bluesky\_title | String | No | Specific text for the Bluesky post. Fallbacks to title. | title |
| reply\_to\_id | String | No | URL or AT-URI of the post to reply to. Creates a reply to the specified post. | - |

Note: To upload content to Bluesky, specify the platform as "bluesky" in the platform\[] array. The maximum character limit is 300 characters per post.

How Bluesky Threads Are Created

If your text exceeds 300 characters, our API automatically creates a Bluesky thread. This works similarly to X (Twitter) and Threads.

How it works:

Our system creates natural-looking threads by intelligently splitting your text:

It groups paragraphs: The system combines as many paragraphs (text separated by a blank line) as possible into a single post without exceeding 300 characters.

It splits long paragraphs: If a single paragraph is too long for one post, it's split into smaller parts. The system first tries to split by line breaks and then by words.

Example of a thread creation

If you send this text in the title:

The API will create a thread like this:

Post 1:

This is the first paragraph. It is short.

This second paragraph is a bit longer. Our API tries to keep paragraphs together.

Post 2:

This is a much longer third paragraph. It probably won't fit with the others. If so, the API will split it into multiple posts automatically.

Example Requests

Upload Text to X (Twitter)

Create a Twitter Thread

Upload Text to LinkedIn (Personal Profile)

Upload Text to LinkedIn (Organization Page)

Upload Text to Facebook Page

Upload Text to Threads and Twitter (X)

Upload Text to Reddit

Upload Text to Bluesky

Create a Bluesky Thread

Reply to a Tweet on X (Twitter)

Reply to a Tweet on X (Twitter) with Excluded Users

Responses

200 OK (synchronous, finished fast)

200 OK (asynchronous/background started or syncâ†’background fallback)

202 Accepted (scheduled)

400 Bad Request

Missing title (content), user, platform\[], invalid platforms, Reddit without subreddit, invalid scheduled\_date. For Facebook without facebook\_page\_id, the per-platform result will include an error entry for facebook.

401 Unauthorized: { "success": false, "message": "Invalid or expired token" }

403 Forbidden (plan restrictions)

404 Not Found (e.g., user not found)

429 Too Many Requests (monthly limit exceeded; includes current usage)

500 Internal Server Error: { "success": false, "error": "Detailed error message" }

Notes

When async or when sync falls back to background, use GET /api/uploadposts/status?request\_id={request\_id} to poll progress.

Per-platform results are returned under results.{platform} and may include fields like url, platform-specific IDs, or error.

--- END OF docs/api/upload-text.md ---


--- START OF docs/api/upload-video.md ---

Upload Video

Upload video to various social media platforms using this endpoint.

Endpoint

Headers

| Name | Value | Description |
|------|-------|-------------|
| Authorization | Apikey your-api-key-here | Your API key for authentication |

Common Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| user | String | Yes | User identifier |
| platform\[] | Array | Yes | Platform(s) to upload to (e.g., "tiktok", "instagram", "linkedin", "youtube", "facebook", "twitter", "threads", "pinterest", "bluesky") |
| video | File | Yes | The video file to upload (can be a file upload or a video URL) |
| title | String | Yes | Default title of the video |
| description | String | No | Optional extended text used only on LinkedIn commentary, Facebook descriptions, YouTube descriptions, and Pinterest notes. Ignored elsewhere. |
| scheduled\_date | String (ISO-8601) | No | Optional date/time (ISO-8601) to schedule publishing, e.g., "2024-12-31T23:45:00Z". Must be in the future (â‰¤ 365 days). Omit for immediate upload. |
| timezone | String (IANA) | No | Optional timezone identifier (e.g., "Europe/Madrid", "America/New\_York"). If provided, scheduled\_date is interpreted in this timezone. Defaults to UTC if omitted. See IANA Time Zone Database for valid values. |
| async\_upload | Boolean | No | If true, the request returns immediately with a request\_id and processes in the background. See Upload Status. |
| first\_comment | String | No | Automatically post a first comment after publishing. Supported on Instagram, Facebook, Threads, Bluesky, Reddit, X, and YouTube. On X (Twitter) and Threads, this creates a reply to the main post. For X threads, the comment is posted as a reply to the last tweet in the thread. On YouTube, it posts as a top-level comment on the video. |

Important: If you set async\_upload to false but the upload takes longer than 59 seconds, it will automatically switch to asynchronous processing to avoid timeouts. In that case, use the request\_id with the Upload Status endpoint to check the upload status and result.

Scheduling behavior: When you provide scheduled\_date, the API responds with 202 Accepted and includes a job\_id. That same job\_id will later appear in Upload History so you can correlate the scheduled job with the eventual publish record. You can also use the job\_id with the Upload Status endpoint to check the execution status of the scheduled post.

Platform-Specific Titles

The title parameter serves as a fallback. To set a custom title for a particular platform, use the optional \[platform]\_title parameter. If provided, it will override the main title for that platform.

Example Optional Parameters:

instagram\_title: "Check out my latest reel on Instagram! #reels"

facebook\_title: "Excited to share this new video with my Facebook friends and family."

tiktok\_title: "New TikTok video just dropped! ðŸ”¥"

linkedin\_title: "A professional insight on the latest industry trends, discussed in this video."

x\_title: "New video out now! ðŸ“¢"

youtube\_title: "My new YouTube video is live!"

pinterest\_title: "An inspiring video pin."

Platform-Specific Parameters

TikTok

For more information about Tiktok API parameters, visit the Tiktok API documentation.

| Name | Type | Required | Description | Default |
|------|------|----------|-------------|---------|
| tiktok\_title | String | No | Specific title for the TikTok post. Fallbacks to title. | title |
| privacy\_level | String | No | Privacy setting ("PUBLIC\_TO\_EVERYONE", "MUTUAL\_FOLLOW\_FRIENDS", "FOLLOWER\_OF\_CREATOR", "SELF\_ONLY") | "PUBLIC\_TO\_EVERYONE" |
| disable\_duet | Boolean | No | Disable duet feature | false |
| disable\_comment | Boolean | No | Disable comments | false |
| disable\_stitch | Boolean | No | Disable stitch feature | false |
| post\_mode | String | No | DIRECT\_POST: Directly post the content to TikTok user's account or MEDIA\_UPLOAD: Upload content to TikTok for users to complete the post using TikTok's editing flow. Users will receive an inbox notification. | DIRECT\_POST |
| cover\_timestamp | Integer | No | Timestamp in milliseconds for video cover | 1000 |
| brand\_content\_toggle | Boolean| No       | Set to true for paid partnerships that promote third-party brands.        | false   |
| brand\_organic\_toggle | Boolean| No       | Set to true when promoting the creator's own business.                    | false   |
| is\_aigc | Boolean | No | Indicates if content is AI-generated | false |

Note on Draft Mode (MEDIA\_UPLOAD): When using MEDIA\_UPLOAD mode (Draft), TikTok does not allow setting a title, caption, privacy settings, or other metadata via the API. The video is simply uploaded to your TikTok inbox/drafts, and you must add the title, caption, and settings manually within the TikTok app before publishing.

The global description field is ignored for TikTok uploads.

Instagram

For more information about Instagram API parameters, visit the Instagram Graph API documentation.

| Name | Type | Required | Description | Default |
|------|------|----------|-------------|---------|
| instagram\_title | String | No | Specific title for the Instagram post. Fallbacks to title. | title |
| media\_type | String | No | Type of media ("REELS" or "STORIES") | "REELS" |
| share\_to\_feed | Boolean | No | Whether to share to feed | true |
| collaborators | String | No | Comma-separated list of collaborator usernames | - |
| cover\_url | String | No | URL for custom video cover | - |
| audio\_name | String | No | Name of the audio track embedded in your video | - |
| user\_tags | String | No | Comma-separated list of user tags | - |
| location\_id | String | No | Instagram location ID | - |
| thumb\_offset | String | No | Timestamp offset for video thumbnail | - |

Note on Instagram audio\_name

Scope: Reels only, and only for the original audio embedded in your uploaded video. It does not let you pick licensed/trending music from Instagramâ€™s library via API.

Limit: You can rename only once (when creating the Reel via API, or later from the audio page if you are the audio owner).

Behavior: The Reel is published using the audio embedded in your video and displays the name you provide in audio\_name.

The global description field is ignored for Instagram video uploads.

LinkedIn

For more information about LinkedIn API parameters, visit the LinkedIn Marketing API documentation.

| Name                    | Type   | Required | Description                                          | Default     |
|-------------------------|--------|----------|------------------------------------------------------|-------------|
| linkedin\_title          | String | No       | Specific title for the LinkedIn post. Fallbacks to title. | title |
| linkedin\_description or description    | String | No       | Sent as the LinkedIn commentary. If omitted, we reuse title. | title |
| visibility              | String | Yes      | Visibility setting ("CONNECTIONS", "PUBLIC", "LOGGED\_IN", "CONTAINER") | "PUBLIC"    |
| target\_linkedin\_page\_id | String | No       | LinkedIn page ID to upload videos to an organization | "107579166" |

YouTube

For more information about YouTube API parameters, visit the YouTube Data API documentation.

| Name | Type | Required | Description | Default |
|------|------|----------|-------------|---------|
| youtube\_title | String | No | Specific title for the YouTube video. Fallbacks to title. | title |
| youtube\_description or description | String | No | Populates snippet.description. If omitted, we send title. | title |
| tags | Array | No | Array of tags | \[] |
| categoryId | String | No | Video category | "22" |
| privacyStatus | String | No | Privacy setting ("public", "unlisted", "private") | "public" |
| embeddable | Boolean | No | Whether video is embeddable | true |
| license | String | No | Video license ("youtube", "creativeCommon") | "youtube" |
| publicStatsViewable | Boolean | No | Whether public stats are viewable | true |
| thumbnail | File | No | Custom thumbnail image to set after upload. Accepts a multipart image file or a public URL. Formats: JPG/PNG/GIF/BMP. Max 2 MB. If both thumbnail (file) and thumbnail\_url are provided, the file takes precedence. YouTube custom thumbnails are not supported for Shorts; they only apply to standard YouTube videos. | - |
| thumbnail\_url | String (URL) | No | Alternative to provide the thumbnail as a public URL. | - |
| selfDeclaredMadeForKids | Boolean | No | Explicit declaration that the video is made for children | false |
| containsSyntheticMedia | Boolean | No | Declaration that the video contains synthetic or AI-generated content | false |
| defaultLanguage | String | No | Language of title and description (BCP-47 code, e.g., "es", "en") | - |
| defaultAudioLanguage | String | No | Language of the video audio (BCP-47 code, e.g., "es-ES", "en-US") | - |
| allowedCountries | String | No | Comma-separated list of country codes where the video is allowed (e.g., "US,CA,MX") | - |
| blockedCountries | String | No | Comma-separated list of country codes where the video is blocked (e.g., "CN,RU") | - |
| hasPaidProductPlacement | Boolean | No | Declaration that the video includes paid product placements | false |
| recordingDate | String | No | Recording date and time of the video (ISO 8601 format, e.g., "2024-01-15T14:30:00Z") | - |

Important: YouTube custom thumbnails are not supported for Shorts; they only apply to standard YouTube videos.

Notes about new YouTube parameters:

Region restrictions: allowedCountries and blockedCountries cannot be used simultaneously. Country codes must be ISO 3166-1 alpha-2 (e.g., "US", "CA", "MX").

Language settings: defaultLanguage affects title and description display, while defaultAudioLanguage specifies the spoken language in the video. Use BCP-47 codes (e.g., "es" for Spanish, "es-ES" for Spain Spanish).

Legal declarations: selfDeclaredMadeForKids is used for COPPA compliance. containsSyntheticMedia provides transparency for AI-generated content. hasPaidProductPlacement ensures FTC compliance.

Facebook

For more information about Facebook API parameters, visit the Facebook Graph API documentation.

| Name             | Type   | Required | Description                                                       | Default     |
|------------------|--------|----------|-------------------------------------------------------------------|-------------|
| facebook\_title   | String | No       | Specific title for the Facebook post. Fallbacks to title. Note: If facebook\_media\_type is "STORIES", this field is ignored.       | title |
| facebook\_description or description      | String | No       | Sent as description for the video. Note: If facebook\_media\_type is "STORIES", this field is ignored. | title |
| facebook\_page\_id | String | Yes      | Facebook Page ID where the video will be posted                   | -           |
| facebook\_media\_type | String | No | Type of media ("REELS" or "STORIES") | "REELS" |
| video\_state      | String | No       | Desired state of the video ("DRAFT", "PUBLISHED")    | "PUBLISHED" |

Note: If facebook\_page\_id is not provided, we will automatically use the user's only connected Page (if exactly one exists). If multiple Pages are connected, the API returns a helpful error with an available\_pages list so you can choose one. Posting to personal Facebook profiles via API is not supported by Meta; only Pages can be posted to.

Threads

For more information about Threads API parameters, visit the Threads API documentation.

| Name | Type | Required | Description | Default |
|------|------|----------|-------------|---------|
| threads\_title | String | No | Specific title for the Threads post. Fallbacks to title. | title |

The global description field is ignored for Threads video uploads.

X (Twitter)

For more information about X API parameters, visit the X API Post Creation documentation.

| Name                        | Type    | Required | Description                                                                                                                           | Default     |
|-----------------------------|---------|----------|---------------------------------------------------------------------------------------------------------------------------------------|-------------|
| x\_title                      | String  | No       | Specific title for the tweet. Fallbacks to title.                                                                                   | title     |
| x\_long\_text\_as\_post          | Boolean | No       | When true, publishes long text as a single post. Otherwise, creates a thread.                                                      | false     |
| reply\_settings               | String  | No       | Controls who can reply to the tweet ("following", "mentionedUsers", "subscribers", "verified")                                       | -           |
| geo\_place\_id                 | String  | No       | Place ID for adding geographic location to the tweet                                                                                  | -           |
| nullcast                     | Boolean | No       | Whether to publish without broadcasting (promotional/promoted-only posts)                                                             | false     |
| for\_super\_followers\_only     | Boolean | No       | Tweet exclusive for super followers                                                                                                   | false     |
| community\_id                 | String  | No       | Community ID for posting to specific communities                                                                                      | -           |
| share\_with\_followers         | Boolean | No       | Share community post with followers                                                                                                   | false     |
| direct\_message\_deep\_link     | String  | No       | Link to take the conversation from public timeline to private Direct Message                                                         | -           |
| tagged\_user\_ids              | Array   | No       | Array of user IDs to tag in the media (max 10 users)                                                                                  | \[]          |
| reply\_to\_id                  | String  | No       | ID of the tweet to reply to. Creates a reply to the specified tweet.                                                                  | -           |
| exclude\_reply\_user\_ids       | Array   | No       | Array of user IDs to exclude from replying to this tweet. Requires reply\_to\_id.                                                    | \[]          |

The global description field is ignored for X uploads.

How X (Twitter) Thread Creation Works (Advanced Logic)

Note: The following describes the default thread creation logic. To override this and post long text as a single post, set the x\_long\_text\_as\_post parameter to true.

The system is engineered to create well-formatted, natural-looking threads on X (formerly Twitter). Instead of simply splitting text at every line break, it intelligently groups paragraphs to create more readable tweets.

Here's the step-by-step logic:

Intelligent Paragraph Grouping (Primary Method):

The function first identifies distinct paragraphs (any text separated by a blank line).
It then combines as many of these paragraphs as possible into a single tweet, filling it up to the 280-character limit without exceeding it. The double newline (\n\n) between combined paragraphs is preserved for formatting.
This results in fewer, more substantial tweets that flow naturally, just as if a person had written them.

Handling Exceptionally Long Paragraphs:

If a single paragraph is, by itself, longer than the 280-character limit, a more granular splitting logic is automatically triggered for that paragraph only:

Split by Line Break: The system first attempts to break the paragraph down by its individual line breaks (\n).

Split by Word: If any of those single lines are still too long, it will split them by words as a final resort.

Media Attachment:

For posts that include photos or videos, all media is attached only to the first tweet of the thread. The subsequent tweets in the thread will be text-only replies.

Pinterest

| Name                                   | Type   | Required | Description                                                                              | Default |
|----------------------------------------|--------|----------|------------------------------------------------------------------------------------------|---------|
| pinterest\_title                        | String | No       | Specific title for the Pinterest Pin. Fallbacks to title.                              | title |
| pinterest\_description or description    | String | No       | Populates pin.description. If omitted, we reuse title.                                | title |
| pinterest\_board\_id                     | String | Yes       | Pinterest board ID to publish the video to.                                              | -       |
| pinterest\_alt\_text   | String | No       | Alt text for the video.                      | -       |
| pinterest\_link                         | String | No       | Destination link for the video Pin.                                                      | -       |
| pinterest\_cover\_image\_url              | String | No       | URL of an image to use as the video cover.                                               | -       |
| pinterest\_cover\_image\_content\_type     | String | No       | Content type of the cover image (e.g., image/jpeg, image/png), used if pinterest\_cover\_image\_data is provided. | -       |
| pinterest\_cover\_image\_data             | String | No       | Base64 encoded cover image data, used if pinterest\_cover\_image\_content\_type is provided. | -       |
| pinterest\_cover\_image\_key\_frame\_time | Integer| No       | Time in milliseconds of the video frame to use as cover.                                 | -       |

Bluesky

| Name | Type | Required | Description | Default |
|---|---|---|---|---|
| bluesky\_title | String | No | Specific text for the Bluesky video post. Fallbacks to title. | title |

Note: Video uploads to Bluesky are limited to 10GB per day/user and 25 videos per day, and 100MBs Maximum. Supported formats: .mp4, .mpeg, .webm, .mov.

Example Requests

Upload a Video to TikTok

Upload a Video to YouTube Using URL

Upload a Video to YouTube With Custom Thumbnail

Upload to YouTube with thumbnail file

Responses

200 OK (synchronous, finished fast)

200 OK (asynchronous/background started, including syncâ†’background fallback)

202 Accepted (scheduled)

400 Bad Request

Missing user, platform\[], video file/URL, invalid scheduled\_date, invalid platform values, Pinterest without pinterest\_board\_id.

401 Unauthorized

403 Forbidden (e.g., TikTok on Free plan)

404 Not Found (e.g., user not found after auth)

429 Too Many Requests (monthly limit exceeded; includes current usage)

500 Internal Server Error

Notes

When async or when sync falls back to background, use GET /api/uploadposts/status?request\_id={request\_id} to poll progress.

Per-platform results may include: url, publish\_id, container\_id, post\_id, video\_urn, video\_reel\_id, video\_id, image\_urns, post\_ids, video\_was\_transcoded, changes, prevalidation\_metadata, or error.

--- END OF docs/api/upload-video.md ---


--- START OF docs/api/user-profiles.md ---

User Profiles API

These endpoints allow you to integrate Upload-Post directly into your platform by managing user profiles and generating secure tokens for account linking.

See the User Profile Integration Guide for a conceptual overview and workflow.

Authentication

All API requests require authentication using your API Key. Include it in the Authorization header for every request:

Replace YOUR\_API\_KEY with the actual API key provided to you.

User Profile Management

Manage user profiles within Upload-Post that correspond to users on your platform.

Endpoint

Create User Profile

Creates a new profile linked to a user on your platform.

Method: POST

Headers:

Authorization: ApiKey YOUR\_API\_KEY

Content-Type: application/json

Body Parameters:

| Name     | Type   | Required | Description                                                                 |
|----------|--------|----------|-----------------------------------------------------------------------------|
| username | String | Yes      | A unique identifier for the user on your platform (e.g., your internal ID). |

Example Body:

Success Response (201 Created):

profile: Contains details of the newly created profile.

created\_at: Timestamp of profile creation.

social\_accounts: Object showing connected accounts (initially empty or with placeholders).

username: The unique identifier provided.

success: Indicates successful creation.

Error Responses:

400 Bad Request: Missing or invalid username.

401 Unauthorized: Invalid or missing API Key.

409 Conflict: A profile with the provided username already exists.

Get User Profiles

Retrieves a list of all user profiles created under your API key.

Method: GET

Headers:

Authorization: ApiKey YOUR\_API\_KEY

Query Parameters: None

Success Response (200 OK):

limit: The maximum number of profiles allowed by the current plan.

plan: The subscription plan associated with the API key.

profiles: An array of user profile objects.

created\_at: Timestamp of profile creation.

social\_accounts: An object detailing connected social media accounts. Each key is the platform name (e.g., facebook, instagram, tiktok). The value can be an object with details (display\_name, social\_images, username) or an empty string/null if not fully connected.

username: The unique identifier for the profile.

success: Indicates successful retrieval.

Error Responses:

401 Unauthorized: Invalid or missing API Key.

Get a Specific User Profile

Retrieves information for a single user profile using its username.

Method: GET

Endpoint: /api/uploadposts/users/{username}

Path Parameters

| Parameter  | Type   | Description                                            |
| :--------- | :----- | :----------------------------------------------------- |
| username | string | Required. The username of the profile to retrieve. |

Success Response (200 OK)

If the profile is found, the API will return a JSON object with the profile details.

Error Response (404 Not Found)

If no profile is found with the specified username, the API will return:

Delete User Profile

Deletes an existing user profile and its associated data (like social connections).

Method: DELETE

Headers:

Authorization: ApiKey YOUR\_API\_KEY

Content-Type: application/json

Body Parameters:

| Name     | Type   | Required | Description                                      |
|----------|--------|----------|--------------------------------------------------|
| username | String | Yes      | The unique identifier of the profile to delete. |

Example Body:

Success Response (200 OK):

Error Responses:

400 Bad Request: Missing or invalid username.

401 Unauthorized: Invalid or missing API Key.

404 Not Found: No profile found with the provided username.

JWT Management

Generate and validate JWTs for the secure social account linking process.

Endpoint: Generate JWT URL

Generates a secure, single-use URL containing a JWT. Your user visits this URL to link their social media accounts.

Method: POST

Headers:

Authorization: ApiKey YOUR\_API\_KEY

Content-Type: application/json

Body Parameters:

| Name         | Type    | Required | Description                                                                                      |
|--------------|---------|----------|--------------------------------------------------------------------------------------------------|
| username     | String  | Yes      | The identifier for the user profile for which the JWT is being generated.                        |
| redirect\_url | String  | No       | (Optional) The URL to which the user will be redirected after linking their social account.      |
| logo\_image   | String  | No       | (Optional) A URL to a logo image to display on the linking page for branding purposes.           |
| redirect\_button\_text | String | No | (Optional) The text to display on the redirect button after linking. Defaults to "Logout connection". |
| connect\_title | String | No | (Optional) Custom title text for the connection page. Defaults to "Connect Social Media Accounts". |
| connect\_description | String | No | (Optional) Custom description text for the connection page. Defaults to "Connect your social media accounts to manage your posts.". |
| platforms    | Array   | No       | (Optional) List of platforms to show for connection. Possible values: 'tiktok', 'instagram', 'linkedin', 'youtube' (not working, waiting for audit), 'facebook', 'x', 'threads'. Defaults to all supported platforms. |
| show\_calendar | Boolean | No       | (Optional) Whether to show the calendar view on the connection page. Defaults to true.         |

Example Body:

Success Response (200 OK):

access\_url: The secure URL your user needs to visit. Redirect your user to this URL.

success: Always true if the request was successful.

duration: The validity period of the generated JWT (48 hours).

Example Request (curl):

Example Request with Calendar Disabled (curl):

Example Success Response (200 OK):

Calendar Deep Link: If you want users to land directly on the shared calendar view, replace the path with /connect/calendar while keeping the token intact, e.g. https://app.upload-post.com/connect/calendar?token=GENERATED\_JWT\_TOKEN. The page will automatically fall back to /connect when the profile has show\_calendar disabled.

Error Responses:

400 Bad Request: Missing or invalid username.

401 Unauthorized: Invalid or missing API Key.

404 Not Found: No profile found with the provided username.

Endpoint: Validate JWT

(Optional) Allows you to validate a JWT token. The primary validation occurs automatically when the user accesses the access\_url.

Method: POST

Headers:

Authorization: Bearer YOUR\_JWT\_TOKEN

Body Parameters: None

Example Request (curl):

Success Response (200 OK - Valid Token): Returns the profile details associated with the token.

profile: Contains details about the user profile linked to the token.

social\_accounts: An object showing the connection status for various platforms (e.g., null if not connected, or details if connected).

username: The unique identifier provided when the profile was created.

success: Indicates the token is valid.

Success Response (200 OK - Invalid Token):

Error Responses:

401 Unauthorized: Invalid, expired, or missing JWT token in the Authorization header.

Facebook Pages

Retrieve Facebook page IDs associated with user profiles to enable posting to Facebook pages.

Endpoint

Get Facebook Pages

Fetches Facebook page IDs associated with a profile. You can use this endpoint to connect and start posting on Facebook pages.

Method: GET

Headers:

Authorization: ApiKey YOUR\_API\_KEY

Query Parameters:

| Name    | Type   | Required | Description                                                                          |
|---------|--------|----------|--------------------------------------------------------------------------------------|
| profile | String | No       | The unique identifier of the profile. If not specified, returns all pages for your account. |

Example Request (curl):

Example Request (without profile parameter):

Success Response (200 OK):

pages: Array of Facebook page objects associated with the profile(s).

page\_id: The Facebook page ID that can be used for posting.

page\_name: The display name of the Facebook page.

profile: The profile identifier associated with this page.

success: Indicates successful retrieval.

Error Responses:

401 Unauthorized: Invalid or missing API Key.

404 Not Found: No profile found with the provided identifier (if profile parameter is specified).

--- END OF docs/api/user-profiles.md ---


--- START OF docs/api/video-requirements.md ---

Video Format Requirements

This document outlines the video format requirements for uploading to various social media platforms via the API.

Automatic Video Transformation

Our API automatically transforms videos to adapt them to the specifications of each social network. However, if you use this feature, the upload will take longer because the transformation is performed first before uploading to the platforms.

If you prefer faster uploads, you can pre-process your videos according to the specific requirements of each platform outlined in this document.

Video Encoding Compatibility

Some video creation tools occasionally produce videos with encoding that Meta's systems don't accept. At times, their output needs to be re-encoded for compatibility.

One Solution: Re-encode with FFmpeg

If your video uploads are failing, try re-encoding the video using FFmpeg, an open-source tool for video processing:

This command converts your video to use the widely-compatible H.264 video codec and AAC audio codec, which Meta platforms accept.

Re-encoding "normalizes" your video to use standard encoding parameters that Meta's platforms are designed to process, without sacrificing quality. If you see these errors regularly, this simple step can save you frustration when sharing your creative content.

FFmpeg Installation and Usage

Installation instructions:

macOS: brew install ffmpeg

Windows: winget install ffmpeg

Linux: sudo apt install ffmpeg (Ubuntu/Debian) or sudo dnf install ffmpeg (Fedora)

Parameters:

-c:v libx264: Uses H.264 video codec

-preset medium: Balance between encoding speed and quality

-profile:v high -level 4.0: Compatibility settings

-pix\_fmt yuv420p: Standard pixel format for maximum compatibility

-b:v 5000k: Video bitrate (adjust as needed for quality)

-c:a aac: AAC audio codec

-b:a 192k: Audio bitrate

-movflags +faststart: Optimizes file for web streaming

TikTok Video Requirements

Supported Formats: MP4 (recommended), WebM, MOV

Supported Codecs: H.264 (recommended), H.265, VP8

Framerate: Minimum: 23 FPS, Maximum: 60 FPS

Picture Size: Minimum: 360 pixels (height and width), Maximum: 4096 pixels (height and width)

Duration: Maximum via API: 10 minutes. (Note: All TikTok creators can post 3-minute videos. Some creators have access to 5-minute or 10-minute videos. Users may trim videos in the TikTok app.)

Size: Maximum: 4GB

Instagram Video Requirements

Container Format: MOV or MP4 (MPEG-4 Part 14)

No edit lists

Moov atom at the head of the file

Audio Codec: AAC

Maximum sampling rate: 48 kHz

1 or 2 channels (mono or stereo)

Audio bitrate: 128 kbps

Video Codec: HEVC or H264

Progressive scan

Closed GOP

Chroma subsampling: 4:2:0

Video bitrate: VBR, maximum 25 Mbps

Frame Rate: 23-60 FPS

Image Size:

Maximum horizontal pixels: 1,920

Aspect ratio: 0.01:1 to 10:1

Recommended aspect ratio: 9:16 (to avoid cropping or white space)

Duration & Size:

Maximum duration: 15 minutes

Minimum duration: 3 seconds

Maximum file size: 300 MB

YouTube Video Requirements

File Size: Maximum: 256 GB

Accepted MIME Types: video/\*, application/octet-stream

Important: Custom thumbnails are not supported for YouTube Shorts; they only apply to standard YouTube videos.

LinkedIn Video Requirements

File Size: Minimum: 75 KB, Maximum: 5 GB

Duration: Minimum: 3 seconds, Maximum: 10 minutes

Resolution:

Range: 256 x 144 to 4,096 x 2,304

Aspect ratio: 1:2.4 to 2.4:1

Technical Specs:

Frame rate: 10-60 fps

Bitrate: 192 kbps - 30 Mbps

Supported Formats: AAC, ASF, FLV, MP3, MP4, MPEG-1, MPEG-4, MKV, WebM, H264/AVC, Vorbis, VP8, VP9, WMV2, WMV3

Facebook Reels Requirements

File Format: MP4 (recommended)

Resolution & Aspect Ratio:

Recommended: 1080 x 1920 pixels

Minimum: 540 x 960 pixels

Aspect ratio: 9:16

Duration:

3-90 seconds

Maximum 60 seconds for page stories

Video Settings:

Frame rate: 24-60 fps

Chroma subsampling: 4:2:0

Closed GOP (2-5 seconds)

Compression: H.264, H.265, VP9, AV1

Progressive scan

Audio Settings:

Bitrate: 128 kbps+

Channels: Stereo

Codec: AAC (low complexity)

Sample rate: 48 kHz

X (Twitter) Video Requirements

Recommended Codec & Profile:

Video: H264 High Profile

Audio: AAC LC (Low Complexity)

Frame Rates:

Recommended: 30 FPS, 60 FPS

Maximum: 60 FPS

Resolution:

Recommended: 1280x720 (landscape), 720x1280 (portrait), 720x720 (square)

Dimensions: 32x32 to 1920x1920

Bitrate:

Minimum Video: 5,000 kbps

Minimum Audio: 128 kbps

Aspect Ratio:

Recommended: 16:9 (landscape/portrait), 1:1 (square)

Range: 1:3 to 3:1

Pixel Aspect Ratio: 1:1

Duration & File Size:

Duration: 0.5 seconds - 14,400 seconds (4 hours) for Premium

Max File Size: 1 GB+ for Premium/Amplify

Technical Video Specs:

Pixel Format: YUV 4:2:0

GOP: Must not be open

Scan Type: Progressive scan

Technical Audio Specs:

Channels: Mono or Stereo (not 5.1 or greater)

High-Efficiency AAC: Not supported

Custom Thumbnails: Supported for Premium/Amplify users

Threads Video Requirements

Container: MOV or MP4

No edit lists

moov atom at the front

Audio Codec: AAC

48kHz sample rate maximum

1 or 2 channels (mono/stereo)

Bitrate: 128 kbps

Video Codec: HEVC or H264

Progressive scan

Closed GOP

4:2:0 chroma subsampling

Frame Rate: 23-60 FPS

Picture Size:

Max columns (horizontal pixels): 1920

Aspect ratio: 0.01:1 to 10:1 (9:16 recommended)

Video Bitrate: VBR, 100 Mbps maximum

Duration:

Max: 300 seconds (5 minutes)

Min: > 0 seconds

File Size: 1 GB maximum

Pinterest Video Requirements

File Size: Maximum: 1 GB

Supported Formats: MP4, MOV, M4V

Duration: Minimum: 4 seconds, Maximum: 15 minutes

Aspect Ratio: Taller than 1.91:1 and shorter than 1:2. Recommended for standard video: 1:1 (square) or 2:3, 4:5 or 9:16 (vertical)

Reddit Video Requirements

Video API posting is not supported by Reddit.

Bluesky Video Requirements

File Size: Maximum: 100 MB

Supported Formats: MP4, MPEG, WebM, MOV

Duration: Minimum: 1 second, Maximum: 60 seconds

Frame Rate: 10-60 FPS

Resolution: Minimum: 360x360 px, Maximum: 1920x1920 px

Aspect Ratio: Automatically detected and passed as metadata

Daily Limit: 50 uploads per day (combined photos and videos)

--- END OF docs/api/video-requirements.md ---


--- START OF docs/api/webhooks.md ---

Upload-Post allows you to receive real-time notifications about your upload statuses. This is particularly useful for asynchronous uploads or scheduled posts where you don't receive an immediate confirmation of the final publish status in the API response.

Configuration

You can configure notifications in the Upload-Post Dashboard:

Configure Notifications

You can choose to receive notifications via:

Webhook: A POST request sent to your server with a JSON payload.

Telegram: A message sent to a configured Telegram chat.

Configuration via API

You can also configure your notification preferences programmatically using the API.

Endpoint: POST https://app.upload-post.com/api/uploadposts/users/notifications

Authentication: Requires a valid API Key.

Request Body:

Response:

Webhook Payload

When an upload process completes (whether successfully or with a failure), Upload-Post sends a POST request to your configured webhook URL. The request body is a JSON object containing details about the event.

Example Payload

Field Descriptions

| Field | Type | Description |
| :--- | :--- | :--- |
| event | string | The type of event. Currently, upload\_completed. |
| user\_email | string | The email address of the user who initiated the upload. |
| profile\_username | string | The username of the profile associated with the upload. |
| platform | string | The social platform where the post was uploaded (e.g., instagram, youtube, tiktok). |
| media\_type | string | The type of media uploaded (video, photo, or text). |
| title | string | The title provided for the post. |
| caption | string | The caption or description of the post. |
| result | object | An object containing the outcome of the upload attempt. |
| result.success | boolean | true if the upload was successful, false otherwise. |
| result.url | string | The direct URL to the published post (if available and successful). |
| result.publish\_id | string | The ID assigned to the post by the platform. |
| result.error | string | A description of the error if the upload failed. |
| created\_at | string | The timestamp of the event in ISO 8601 format. |

Usage Notes

Idempotency: While we strive to deliver each notification exactly once, you should handle potential duplicate events based on your own unique identifiers if necessary (though post\_id or publish\_id can serve this purpose for successful posts).

Security: Ensure your webhook endpoint is secure (HTTPS) and verify the data as needed for your application logic.

--- END OF docs/api/webhooks.md ---


--- START OF docs/guides/airtable-integration.md ---

Airtable Integration

Manage your video uploads to social media platforms directly from Airtable.

Set Up

Running Airtable Automation Scripts requires a paid Airtable plan that includes automations with scripts.

This guide shows you how to automatically upload videos to social media platforms from Airtable via Upload-Post.

Gather Your API Key

Start by getting your API Key from your Upload-Post account in the "API Keys" section. This key will be used in the script.

Be sure you have configured your social media accounts in Upload-Post before proceeding.

:::info
URL Support for Media Files: You can now pass URLs for both photo and video uploads instead of binary files. Simply provide the direct URL to your media file in the video or photos\[] parameter.
:::

Create an Airtable Workspace

In Airtable, create a new workspace with these fields:

Title as Single Line Text

Platforms as Multi Select with types: tiktok, instagram

Video as Attachment

User as Single Line Text

Status as Single Line Text

Enter Test Video Data

Add sample data to test the integration:

Title: Enter a title for your video

Platforms: Select one or more platforms (tiktok, instagram)

Video: Attach a video file (MP4 format recommended)

User: Enter your username

Status: Enter pending (lowercase)

Build an Automation Script

Let's create an Airtable automation script that uploads videos via Upload-Post:

Add Trigger

In your workspace, click on Automation then +New automation

Name the automation

Click Choose a Trigger

Select When a Record is Created

Select your table

Click Done

Add Action

Click Add Action

Select Run Script

Delete any default code in the script editor

Copy and paste this code:

Replace Your API Key with your actual Upload-Post API key.

Test the Script

In the script editor, press >Test

The script will run and process any pending records. If successful, you'll see your videos being uploaded to the selected platforms, and the Status field will update to "success".

Security Best Practices

Never share your API key

Consider using environment variables where possible

Review records before processing large batches

--- END OF docs/guides/airtable-integration.md ---


--- START OF docs/guides/async-uploads.md ---

Avoid Timeouts with Asynchronous Uploads

Are your requests taking too long and resulting in timeouts? For video, photo, or text post uploads that may require more processing time (file processing, social network publishing queues, etc.), use the async\_upload parameter to make your request asynchronously.

How does it work?

Send your request with async\_upload=true to the appropriate upload endpoint.

The API will immediately respond with a request\_id.

Use this request\_id to check the progress and result at the status endpoint.

Checking Status

The status endpoint supports two different identifier types:

request\_id: Returned by upload endpoints when async\_upload=true

job\_id: Returned when you schedule posts with scheduled\_date

For Async Uploads

For Scheduled Posts

After scheduling a post with scheduled\_date, the API returns a job\_id. Use it to check the status after the scheduled time:

Relevant Endpoints

Text upload: POST /api/upload\_text

Video upload: POST /api/upload

Photo upload: POST /api/upload\_photos

Upload status: GET /api/uploadposts/status?request\_id=\<REQUEST\_ID> or ?job\_id=\<JOB\_ID>

Quick Example: Asynchronous Video Upload

--- END OF docs/guides/async-uploads.md ---


--- START OF docs/guides/authentication.md ---

Authentication

Upload-Post uses API keys to authenticate requests. This guide explains how to obtain and use your API key.

Getting Your API Key

Log in to your Upload-Post Dashboard

Navigate to the "API Keys" section

Click "Generate New API Key"

Copy and securely store your API key

Using Your API Key

Include your API key in the Authorization header of all API requests:

Example Request

Security Best Practices

Never share your API key: Keep your API key confidential

Use environment variables: Store your API key in environment variables

Rotate keys regularly: Generate new API keys periodically

Restrict access: Only share API keys with trusted team members

Monitor usage: Regularly check your API key usage in the dashboard

API Key Limits

Free tier includes 10 uploads per month

Additional uploads available through paid plans

Troubleshooting

If you receive a 401 Unauthorized error:

Verify your API key is correct

Check if your API key has expired

Ensure you're using the correct header format

Confirm your account is active

For additional help, contact our support team.

--- END OF docs/guides/authentication.md ---


--- START OF docs/guides/error-handling.md ---

API Error Handling: Upload Endpoints

This document explains the structure of responses you will receive from the Video Upload (POST /api/upload) and Photo Upload (POST /api/upload\_photos) endpoints, including how success and errors are indicated.

1\. Successful Request Processing (HTTP 200 OK)

When your upload request is successfully processed by our server (meaning your authentication was valid, input was generally okay, and usage limits weren't exceeded before starting), you will always receive an HTTP 200 OK status code.

The JSON response body will look like this:

Key Points:

"success": true indicates the API server processed your request.

"results": This dictionary is crucial. It contains the outcome for each individual platform you requested.

Platform Success: If results\[platform].success is true, the upload to that platform likely succeeded. Additional platform-specific IDs (like publish\_id, container\_id, post\_id) may be included.

Platform Failure: If results\[platform].success is false, the upload to that specific platform failed. The results\[platform].error field will contain a message explaining the reason (e.g., token expired, API error from the platform, file issue).

Important: An error on one platform (like LinkedIn in the example) does not stop attempts on other platforms. Always check the success flag for each platform in the results.

"usage": Provides information about your current API usage count and limit after this request.

2\. Request Failure (Non-200 HTTP Status Codes)

If there's a fundamental problem with your request before we attempt to upload to individual platforms, you will receive an HTTP status code other than 200 OK. The response body will typically look like this:

Here are common error status codes and their meanings:

400 Bad Request

Meaning: Your request was malformed or missing required information.

Common Causes: Missing video or photos file, missing title, invalid platform name, missing user identifier in the form data when required.

message examples: "Video file and title are required", "Title cannot be empty", "Username required", "Invalid platforms: \[platform\_name]", "Username not associated with any profile".

401 Unauthorized

Meaning: Authentication failed.

Common Causes: Missing Authorization header, using an invalid or expired API Key or Bearer Token.

message examples: "Authorization header required", "Invalid or expired token", "Invalid API key", "API key expired".

404 Not Found

Meaning: The user associated with your authentication could not be found in our system.

message example: "User not found".

429 Too Many Requests

Meaning: You have exceeded an API usage limit.

Common Causes: Reaching your monthly upload limit, or (for Professional plan users) reaching the daily upload limit for a specific social media account.

message examples: "You have reached your monthly limit of X uploads", "You have reached the daily limit of 5 uploads for: Instagram (account\_name)".

500 Internal Server Error

Meaning: An unexpected error occurred on our server while processing your request.

message example: Usually contains technical details about the error. If you encounter this repeatedly, please contact support.

In summary: Always check the HTTP status code first. If it's 200 OK, examine the success flag within the results dictionary for each platform. If it's not 200 OK, check the message field in the response body for the reason.

--- END OF docs/guides/error-handling.md ---


--- START OF docs/guides/limit-of-uploads.md ---

Limit of uploads

Social Hard Caps Per Network

To protect your connected accounts and stay compliant with each social network, Upload-Post enforces platform hard caps using a rolling 24-hour window. When a cap is reached for a specific account on a given network, further posts to that account/network are rejected until the window rolls over.

What counts toward the cap: only successful publishes recorded for that account/network in the last 24 hours.

Scope: Per connected social account. These limits are NOT global to your Upload-Post user.

Example: If you manage 5 Profiles, and each Profile has its own TikTok account connected, you get the full limit for each TikTok account. (e.g., 5 TikTok accounts Ã— 15 posts = 75 posts per day total).

Scheduled posts: caps are re-checked at execution time; if the cap is already reached, the publish will be rejected then.

Recommended and enforced daily caps

| Social Network     | Hard Cap (posts per 24h) |
| :----------------- | -----------------------: |
| Instagram          |                       50 |
| TikTok             |                       15 |
| LinkedIn           |                      150 |
| YouTube            |                       10 |
| Facebook           |                       25 |
| X (Twitter)        |                       50 |
| Threads            |                       50 |
| Pinterest          |                       20 |
| Reddit             |                       40 |
| Bluesky            |                       50 |

Error response when the cap is reached

Status: 429 Too Many Requests

Body example:

What else the verifier checks

Duplicate/similar content within 48h (per account/network) to reduce spam risk and shadow bans.

Mention limits to avoid spammy behavior (e.g., excessive mentions or repeating the same handle too frequently).

Media and content sanity checks evolve over time to align with network guidelines.

--- END OF docs/guides/limit-of-uploads.md ---


--- START OF docs/guides/make-integration.md ---

Make Integration

Upload-Post provides seamless integration with Make (formerly Integromat) for automated video publishing workflows. This guide walks you through connecting your Upload-Post account with Make in 3 simple steps.

Getting Started with Upload-Post

Create an account or log in to your existing Upload-Post account

Navigate to the "API Keys" section

Generate an API key for your Make integration

API Configuration

For Make integration, you'll need to configure an HTTP module with the following parameters:

Note: Find your API key in your Upload-Post Manage API Keys section.

:::info
URL Support for Media Files: You can now pass URLs for both photo and video uploads instead of binary files. Simply provide the direct URL to your media file in the video or photos\[] parameter.
:::

Form Data Configuration & Make.com Setup

Configure your Make HTTP module with these parameters:

| Field | Value | Required |
| ----- | ----- | -------- |
| title | Your video title | Optional |
| user | Your username | Required |
| platform\[] | tiktok | Required |
| video | Binary file | Required |

Make.com Configuration Steps:

Add an HTTP Module: In your Make.com scenario, add an HTTP module and choose the "Make a Request" action.

Configure the Request Settings:

Method: Set to POST.

URL: Enter https://api.upload-post.com/api/upload.

Headers: Add a header with:

Key: Authorization

Value: Apikey \[YOUR\_API\_KEY]

Set the Request Body: Change the body type to multipart/form-data and add the following form fields:

title: Set the value to your desired title (you can use a variable if needed).

user: Enter your username you set in Upload-Post.

platform\[]: Set the value to tiktok.

video: Attach the binary file (your video file). Make sure this field is mapped to the binary data you want to send.

Save and Test: Save your scenario and run a test to ensure that the video upload works correctly via the API.

Advanced Configuration Options

For Instagram Uploads

To upload to Instagram instead, simply change the platform value to instagram in your form data.

Uploading to Multiple Platforms

To upload to both TikTok and Instagram simultaneously, add both platform values by creating multiple fields with the same name platform\[] in the Make.com HTTP module.

Securely Storing API Keys in Make.com

For better security, avoid hardcoding your API key directly in scenarios:

Create an App Key in Make.com

Store your Upload-Post API key as a constant

Reference the constant in your HTTP module headers

When sharing scenarios, use scenario blueprints which do not expose your keys

Example of referencing an API key constant in Make:

Need more guidance? Check out this detailed forum post: Make.com Community Tutorial

Need Assistance?

For additional help with your Make integration, contact our support team.

--- END OF docs/guides/make-integration.md ---


--- START OF docs/guides/n8n-integration.md ---

n8n Integration

Upload-Post provides seamless integration with n8n for automated video publishing workflows. This guide walks you through connecting your Upload-Post account with n8n.

Getting Started with Upload-Post

Create an account or log in to your existing Upload-Post account

Navigate to the "API Keys" section

Generate an API key for your n8n integration

API Configuration

For n8n integration, you'll need to configure an HTTP Request node with the following parameters:

:::info
URL Support for Media Files: You can now pass URLs for both photo and video uploads instead of binary files. Simply provide the direct URL to your media file in the video or photos\[] parameter.
:::

n8n Workflow Configuration

Configure your n8n HTTP Request node with these parameters:

| Field | Value | Required |
| ----- | ----- | -------- |
| title | Your video title | Optional |
| user | Your username | Required |
| platform\[] | tiktok | Required |
| video | Binary file | Required |

Node Configuration Steps:

Add an HTTP Request Node to your workflow

Configure the node settings:

Method: POST

URL: https://api.upload-post.com/api/upload

Headers: Authorization: Apikey \[YOUR\_API\_KEY]

Body: Set to multipart/form-data and add the required fields

Complete JSON Node Configuration

Below is the complete JSON configuration for the HTTP Request node in n8n:

For Instagram Uploads

To upload to Instagram instead, change the platform value:

Uploading to Multiple Platforms

To upload to both TikTok and Instagram simultaneously:

Security Best Practices

Never hardcode your API key directly in the workflow

Create a Credentials entry in n8n for your Upload-Post API key

Reference the credential in your HTTP Request node

For workflows that will be shared, export without credentials

Consider using environment variables or n8n's credential store

Example Workflow: AI-powered Social Media Publisher

This workflow automates video publishing with AI-generated descriptions:

Google Drive Trigger: Monitors a folder for new videos

OpenAI Transcription: Extracts audio and converts to text

OpenAI Description Generator: Creates engaging descriptions

Upload-Post HTTP Request: Uploads to multiple platforms

Error Handling: Sends notifications on completion/errors

This workflow is available as a template: View template on n8n.io

Need Assistance?

For additional help with your n8n integration, contact our support team.

--- END OF docs/guides/n8n-integration.md ---


--- START OF docs/guides/reached-active-user-cap-error.md ---

Error: {"code":"reached\_active\_user\_cap"}

If you've encountered this error, don't worry. This is not an issue with your account, your content, or our platform's stability. It's a temporary limitation from the TikTok API.

This error means that the daily limit of active users allowed by TikTok for our application has been reached.

What is a "Daily Active User"?

In this context, a "daily active user" is anyone who uses our application to interact with the TikTok API on a given day. TikTok sets a cap on how many unique users can do this through a single application (like ours) within a 24-hour period.

What should you do?

Your account and content are safe. This is not a penalty or a block on your account.

The best solution is to wait and retry. The user cap is reset by TikTok every 24 hours. We recommend waiting a few hours before trying to post again.

If the error persists for more than 24 hours, please try again the next day.

Why does this happen?

To manage their platform's resources, TikTok imposes a daily usage quota on every application that connects to its API. Due to the rapid growth of our user community, we are sometimes hitting this maximum allowed number of daily users.

What are we doing about it?

We are actively working on a solution. We are in direct communication with TikTok's developer support team to request an increase in our daily user quota.

Unfortunately, the timeline for this increase is determined by TikTok, and we cannot expedite their internal review process. We appreciate your patience as we work to resolve this for good.

Thank you for your understanding. We are committed to providing a reliable service and are doing everything we can to support our growing community.

--- END OF docs/guides/reached-active-user-cap-error.md ---


--- START OF docs/guides/user-profile-integration.md ---

White-label Integration Guide

Profiles diagram

This guide explains how to integrate Upload-Post directly into your own platform. This allows your users to connect their social media accounts securely through Upload-Post, enabling your platform to manage their profiles and posts via the API on their behalf.

Integration Flow Overview

The core idea is to create a unique profile within Upload-Post for each user on your platform who wants to connect their social accounts. You then generate a special, secure URL that the user visits to link their accounts. Once linked, your platform can interact with the Upload-Post API using the user's unique identifier.

Step-by-Step Integration

Step 1: Create a User Profile

For each user on your platform, you need to create a corresponding profile in Upload-Post. This is done by making a POST request to the /api/uploadposts/users endpoint.

Requirement: You must provide a unique username in the request body. This username should be a stable identifier that links the Upload-Post profile back to the user on your platform (e.g., your internal user ID).

Authentication: Remember to include your Authorization: ApiKey YOUR\_API\_KEY header.

Result: The API will respond with details of the created profile, confirming the username.

âž¡ï¸ See details: Create User Profile API Reference

Step 2: Generate the Secure JWT URL

Once the profile exists, you need to generate a secure URL that your user will use to connect their social media accounts. Make a POST request to the /api/uploadposts/users/generate-jwt endpoint.

Requirement: In the request body, provide the same unique username (from Step 1). You can also include the following optional fields:

redirect\_url: A URL to which the user will be redirected after linking their account.

logo\_image: A URL to a logo image for branding on the linking page.

redirect\_button\_text: (Optional) The text to display on the redirect button after linking. Defaults to "Logout connection".

connect\_title: (Optional) Custom title text for the connection page.

connect\_description: (Optional) Custom description text for the connection page.

platforms: (Optional) List of platforms to show for connection. Defaults to all supported platforms.

show\_calendar: (Optional) Whether to show the calendar view on the connection page. Defaults to true.

Authentication: Include your Authorization: ApiKey YOUR\_API\_KEY header.

Result: The API will return a JSON object containing an access\_url. This URL contains a secure token (JWT) valid for 48 hours.

âž¡ï¸ See details: Generate JWT URL API Reference

Step 3: User Connects Accounts

Redirect your user to the access\_url obtained in Step 2. This URL will open the Upload-Post connection interface, guiding the user through the process of securely connecting their desired social media accounts (like Instagram, TikTok, Facebook, etc.) to their profile.

Enhanced Connect Experience:

Professional Navigation: Tab-based interface for easy switching between account connection and calendar view

Calendar View (if enabled): Users can view their scheduled posts and upload history directly from the connect page

Customizable Interface: You can control the branding, title, and available features through the JWT parameters

Secure OAuth Flows: Upload-Post handles all authentication and token storage securely

The connection URL is valid for 48 hours, giving users ample time to complete the linking process.

Step 4: Manage User Content via API

After the user successfully connects their accounts in Step 3, your platform can now use other Upload-Post API endpoints to manage content on their behalf.

When making calls to endpoints like Upload Photo or Upload Video, you will typically include the user's unique username (the one you used in Step 1 and 2) in the request parameters to specify which profile's connected accounts should be used.

You can also retrieve the list of profiles and their connected accounts using the GET /api/uploadposts/users endpoint.

âž¡ï¸ See details: Get User Profiles API Reference

Authentication

All API requests related to user profile management (/api/uploadposts/users and /api/uploadposts/users/generate-jwt) require authentication using your API Key. Include it in the Authorization header for every request:

Replace YOUR\_API\_KEY with the actual API key provided to you.

(Note: The /api/uploadposts/users/validate-jwt endpoint uses Bearer token authentication, as detailed in its specific documentation).

Next Steps

With the user profiles created and accounts linked, explore the other API references to start managing content:

Upload Photo API Reference

Upload Video API Reference

--- END OF docs/guides/user-profile-integration.md ---


--- START OF docs/guides/youtube-quota-explained.md ---

Understanding YouTube API Quota Limits

âš ï¸ DEPRECATED:
We have now received our own dedicated YouTube API quota. You no longer need to configure your own Google Cloud project. All YouTube features are available directly from our platform without any extra setup.

We believe in being transparent with our community about the challenges we face and the solutions we implement. This document explains the current situation regarding YouTube's API quota and introduces a new feature that gives you more control.

The Challenge: YouTube's API Quota

Every application that interacts with YouTube, including ours, is subject to a daily API quota. This quota determines how many actions (like uploads, comments, or data requests) can be performed through our platform each day.

Due to the incredible growth of our user base, we are frequently reaching the limit of our current quota. This can sometimes result in temporary service disruptions for YouTube-related features.

What We Are Doing About It

For the past six months, we have been in ongoing discussions with YouTube's leadership team to request a significant increase in our daily quota. We believe a higher quota is essential to reliably serve our growing community.

Unfortunately, this process has been slower than anticipated, and we are still awaiting a final decision. We are persistently following up and providing all necessary information to make our case.

Our Solution: Use Your Own Google Cloud Project

To provide a stable and reliable solution while we wait for the quota increase, we have implemented a new feature: you can now connect your own Google Cloud project to our application.

By doing this, you will use your own personal YouTube API quota instead of our shared, limited quota.

Benefits of This Approach:

Reliability: You are no longer affected by our shared quota reaching its limit. As long as your personal quota has not been exceeded, your YouTube actions will succeed.

Control: You have full visibility and control over your own API usage through your Google Cloud Console.

No More Waiting: This immediately solves the issue for you, without having to wait for our negotiations with YouTube to conclude.

How to Connect Your Own Google Cloud Project

Here is a step-by-step guide to connect your own project and use your personal API quota:

Go to the Google Cloud Console.

Create a new project or select an existing one.

Enable the YouTube Data API v3 for your project. You can find this in the "APIs & Services" > "Library" section.

Navigate to "APIs & Services" > "Credentials".

Click "Create Credentials" and select "OAuth client ID".

If prompted, configure the "OAuth consent screen":

Select "External" for the user type.

Provide an app name (e.g., "My Upload-Post Connection"), your user support email, and developer contact information. You can use your own email address for all fields.

For the "Application type", choose "Web application".

Under "Authorized redirect URIs", click "ADD URI" and paste the following URL:

Click "Create". You will now see your Client ID and Client Secret.

Copy these credentials. You will need to enter them into our application to complete the connection.

After obtaining your Client ID and Client Secret, you can securely enter them in your account settings within our application to finalize the connection.

Thank you for your patience and understanding. We remain committed to resolving the quota issue at the platform level and will keep you updated on our progress.

--- END OF docs/guides/youtube-quota-explained.md ---


--- START OF docs/introduction.md ---

Upload-Post Social Media API

Welcome to Upload-Post

Upload-Post is your go-to API solution for seamless content management across multiple social media platforms. Our API simplifies the process of uploading and managing your social media content, making it easy for developers and creators to automate their social media presence.

What is Upload-Post?

Upload-Post provides a streamlined API for uploading and managing content across popular social media platforms. Through our simple REST API, you can upload videos and photos to multiple platforms with minimal effort. Our platform handles all the complexities of social media APIs, allowing you to focus on creating great content.

The API follows REST principles, with endpoints representing different types of content uploads accessible via standard HTTP methods. All data is exchanged in JSON format, making integration straightforward and efficient.

Supported Social Networks

Upload-Post currently supports six major social media platforms:

TikTok

Upload videos

Set video titles

Manage content metadata

Instagram

Upload photos

Add descriptions

Set post titles

LinkedIn

Share articles

Post updates

Upload images

YouTube

Upload videos

Set video metadata

Manage playlists

Facebook

Post updates

Share links

Upload photos and videos

X (Twitter)

Post tweets

Upload media

Thread support

Bluesky

Post text updates

Upload images

Upload video

Thread support

Decentralized social networking

We integrate directly with each platform's official APIs to ensure reliable, secure, and compliant content management.

API-First Approach

At Upload-Post, we believe in an API-first approach. This means:

Developer-Focused: Everything is designed with developers in mind

Simple Integration: Easy to integrate into any application

Clear Documentation: Comprehensive guides and examples

Reliable Service: Stable and secure API endpoints

Getting Started with Upload-Post

Register with Upload-Post

Create your account at upload-post.com

Get your API key from the dashboard

Connect Social Accounts

Link your social media accounts

Grant necessary permissions

Explore the API

Check out our API Reference

Try our Quickstart Guide

Start Uploading

Use our simple endpoints to upload content

Monitor your upload status

Manage your content across platforms

Why Choose Upload-Post?

Simple Integration: Get started in minutes with our straightforward API

Reliable Service: Built on stable, production-ready infrastructure

Cost-Effective: Start with 10 free uploads per month

Developer Support: Comprehensive documentation and support

Secure: Enterprise-grade security for your content and API keys

Next Steps

Check out our Quickstart Guide to make your first API call

Explore our API Reference for detailed endpoint documentation

Need Help?

Contact our support team at info@upload-post.com

Follow us on X (Twitter) @HiImg2html for updates

Check our FAQ for common questions

--- END OF docs/introduction.md ---


--- START OF docs/landing.md ---

Upload-Post API

Your API Solution for Social Media Content Management

Upload-Post simplifies content management for developers and creators by providing a powerful API for uploading content to multiple social media platforms. Our platform handles all the complexities of social media APIs, allowing you to focus on creating great content.

Key Features

Simple Integration

Get started in minutes with our straightforward API. Upload content to multiple social platforms with just a few lines of code.

Reliable Service

Built on stable, production-ready infrastructure. Our platform ensures your content is delivered reliably to your social media accounts.

Cost-Effective

Start with 10 free uploads per month. Scale up as your needs grow with our flexible pricing plans.

Developer Support

Comprehensive documentation, SDK examples, and dedicated support to help you succeed.

SDK Support

Python SDK

PyPI version

JavaScript SDK

npm version

Getting Started

Create Your Account

Sign up at upload-post.com

Complete your profile information

Connect Your Social Accounts

Link your social media accounts

Grant necessary permissions

Generate Your API Key

Get your API key from the dashboard

Start making API calls

Start Uploading

Use our simple endpoints to upload content

Monitor your upload status

Manage your content across platforms

Technical Features

Robust Error Handling

Detailed error messages

Automatic retries for transient failures

Rate limit monitoring

Security

API key authentication

HTTPS encryption

OAuth 2.0 for social media connections

Regular security audits

Performance

Fast upload speeds

Parallel processing

Content optimization

Global CDN support

Monitoring

Real-time upload status

Detailed analytics

Usage monitoring

Rate limit tracking

Use Cases

Content Creators

Schedule posts across platforms

Maintain consistent branding

Track engagement metrics

Automate content distribution

Digital Agencies

Manage multiple client accounts

Bulk upload capabilities

Campaign scheduling

Performance reporting

E-commerce

Product updates across platforms

Automated catalog syncing

Social commerce integration

Inventory status updates

Media Companies

News distribution

Content syndication

Multi-platform publishing

Asset management

Why Choose Upload-Post?

API-First Approach: Designed for developers, with clear documentation and examples

Secure: Enterprise-grade security for your content and API keys

Scalable: From startups to enterprises, our platform grows with you

Support: Expert assistance when you need it

Supported Platforms

TikTok

Upload videos

Set video titles

Manage content metadata

Instagram

Upload photos

Add descriptions

Set post titles

LinkedIn

Share articles

Post updates

Upload images

YouTube

Upload videos

Set video metadata

Manage playlists

Facebook

Post updates

Share links

Upload photos and videos

X (Twitter)

Post tweets

Upload media

Thread support

Bluesky

Post text updates

Upload images

Thread support

Integration Support

API Documentation

Comprehensive API reference

Code examples in multiple languages

Best practices guide

Rate limit documentation

SDKs and Tools

Official Python SDK

Official JavaScript SDK

Command-line interface

Webhook support

Community and Support

Technical documentation

Integration guides

Sample applications

Best practices

Next Steps

Check out our Quickstart Guide to make your first API call

Explore our API Reference for detailed endpoint documentation

Try our SDK Examples for Python and JavaScript implementations

Need Help?

Contact our support team at info@upload-post.com

Follow us on X (Twitter) @HiImg2html for updates

Check our FAQ for common questions

--- END OF docs/landing.md ---


--- START OF docs/quickstart.md ---

Quickstart Guide

This guide will help you get started with the Upload-Post API in minutes.

Quick Start

Prerequisites

An Upload-Post account

Connected TikTok and/or Instagram accounts

API key from your dashboard

Step 1: Create Your Account

Visit upload-post.com

Sign up for a new account

Step 2: Connect Your Social Media Accounts

Navigate to User Management

Create a profile with a name of your choice (this name will be used in API calls)

Click on one of the social media networks

Follow the authentication flow for the selected platform

Grant necessary permissions for content upload

Step 3: Generate Your API Key

Go to the API Keys section. Api Keys

Click "Generate New API Key"

Copy and save your API key securely

Step 4: Make Your First API Call

Upload a Video to TikTok

Upload a Photo to Instagram

Next Steps

Check out our API Reference for detailed endpoint documentation

Explore our SDK Examples for code samples in your preferred programming language

Need Help?

Check our FAQ for common questions

Contact our support team at info@upload-post.com

--- END OF docs/quickstart.md ---


--- START OF docs/resources/character-limits.md ---

Social Media Character Limits

This guide summarizes the most relevant text limits for each social network supported by Upload-Post. Keep these constraints in mind when building payloads so posts are accepted without truncation.

Platform-Specific Character Limits

Facebook Character Limits

| Property | Description |
| --- | --- |
| post | 63,206 characters maximum |
| title | Reels title â€“ 255 characters maximum |

Instagram Character Limits

| Property | Description |
| --- | --- |
| post | 2,200 characters maximum |
| altText | 1,000 characters maximum per image |
| comment | 2,196 characters maximum |

LinkedIn Character Limits

| Property | Description |
| --- | --- |
| post | 3,000 characters maximum |
| title | 400 characters maximum |
| comment | 1,250 characters maximum |

TikTok Character Limits

| Property | Description |
| --- | --- |
| post | 2,200 characters maximum |

Pinterest Character Limits

| Property | Description |
| --- | --- |
| post | 500 characters maximum |
| title | 100 characters maximum |
| link | 2,048 characters maximum |
| altText | 500 characters maximum |

Reddit Character Limits

| Property | Description |
| --- | --- |
| post | 5,000 characters maximum |
| title | 300 characters maximum |
| comment | 10,000 characters maximum |

Threads Character Limits

| Property | Description |
| --- | --- |
| post | 500 characters maximum |

X (Twitter) Character Limits

| Property | Description |
| --- | --- |
| post | 280 characters maximum |
| post (Premium) | 25,000 characters maximum for Premium and Premium Plus accounts |
| altText | 1,000 characters maximum per image |
| subTitleName | 150 characters maximum |

Bluesky Character Limits

| Property | Description |
| --- | --- |
| post | 300 characters maximum |
| images | Up to 4 images per post |
| altText | Supported |

YouTube Character Limits

| Property | Description |
| --- | --- |
| post | 5,000 characters maximum |
| youTubeOptions > title | 100 characters maximum |
| youTubeOptions > tags | 500 characters total, 2+ characters each |
| youTubeOptions > subTitleName | 150 characters maximum |

Content Restrictions

Banned Hashtags

Upload-Post validates content against a list of prohibited hashtags before posting to Instagram. Posts containing any of these hashtags will be rejected with a validation error. The complete list of banned hashtags includes:

A: anorexia, alone, a$$, antivax, abdl, addmysc, adulting, always, armparty, asiagirl

B: beautyblogger, bikinibody, boho, blogladrona, brain, besties, bikinibod

C: costumes, curvygirls, cancer

D: date, dating, desk, dm

E: elevator, edm, endme

F: followtrain, followtrains

G: graffitiigers, girlsonly, gloves

H: hardworkpaysoff, happythanksgiving, humpday, hustler, hotgirls

I: iphonegraphy, italiano, ifb

K: kansas, killingit, kissing, kill, killme, killyourself, kys

M: master, models, mustfollow, milf, midget

N: nasty, newyearsday

P: petite, petitegirls, pushups, payme

S: saltwater, shit, shower, single, singlelife, skype, snap, snapchat, snapchatme, snowstorm, sopretty, stranger, streetphoto, sunbathing, swole, suicide, suicideawareness

T: tag4like, tanlines, teens, teen, thought, todayimwearing

U: undies, unbalanced

V: valentinesday

W: workflow

Y: youngmodel, yolo

If your content includes any of these hashtags, remove them before submitting your request to avoid validation errors.

API Considerations

Upload-Post validates payload sizes before sending them to social networks whenever limits are known. Requests that exceed the documented limits return a validation error.

Some platforms might truncate overlong text instead of rejecting it (Meta products and YouTube occasionally do this). Inspect the per-platform response inside results to confirm the final content.

For channels with strict limits such as X, consider shortening URLs in your application prior to calling the Upload-Post API.

Updates and Changes

Social networks regularly adjust their limits. We keep this page aligned with the latest behavior we observe in production, but you should also:

Check Upload-Post API responses for detailed error messages about rejected posts.

Subscribe to our release notes for platform updates.

Revisit this reference periodically, especially before large content campaigns.

--- END OF docs/resources/character-limits.md ---


--- START OF docs/resources/common-errors.md ---

Common Errors

This guide covers the most common errors you might encounter when using Upload-Post and how to resolve them. Errors are organized by category to help you quickly find solutions.

Session Expired {#session-expired}

Session and authentication errors occur when the connection between Upload-Post and your social media account has been broken. This is usually easy to fix by reconnecting your account.

Common Session Errors

| Error Message | Platform | Solution |
|---------------|----------|----------|
| "Your \[Platform] session has expired" | All | Reconnect your account |
| "Token expired and refresh failed" | All | Reconnect your account |
| "The session has been invalidated because the user changed their password" | Facebook/Instagram | Reconnect after password change |
| "Error validating access token" | Facebook/Instagram | Verify permissions and reconnect |
| "Your X session has expired and could not be refreshed" | X (Twitter) | Reconnect your X account |
| "User has not authorized application" | Various | Grant permissions and reconnect |
| "Unauthorized" | Various | Reconnect your account |

How to Fix Session Errors

Go to Manage Users

Find the affected account - Look for accounts with warning indicators

Disconnect the account - Click the disconnect/remove button next to the account

Reconnect the account - Click "Connect" and complete the authorization flow

Grant all permissions - Make sure to approve all requested permissions during reconnection

:::tip
If you recently changed your password on a social media platform, you'll need to reconnect that account in Upload-Post.
:::

Account Blocked {#account-blocked}

These errors occur when there's an issue with your account on the social media platform itself. Upload-Post cannot fix these - you need to resolve them directly on the platform.

Common Account Status Errors

| Error Message | Platform | What It Means |
|---------------|----------|---------------|
| "Sessions for the user are not allowed because the user is not a confirmed user" | Facebook | Account needs verification |
| "The YouTube account of the authenticated user is suspended" | YouTube | Account suspended by YouTube |
| "Your account is temporarily locked" | X (Twitter) | X has locked your account |
| "The Instagram account is restricted or inactive" | Instagram | Instagram has restricted your account |
| "Action suspected as spam. Activity is restricted" | Instagram | Spam detection triggered |
| "The user used for authentication is suspended" | Various | Account suspended on platform |

How to Fix Account Blocked Errors

These issues must be resolved directly on the social media platform:

Facebook/Instagram Account Not Confirmed

Go to facebook.com and log in

Check for any verification prompts or security notices

Go to Settings & Privacy > Settings > Personal Details

Verify your email and phone number are confirmed

Visit Facebook Account Quality to check for restrictions

After resolving issues, reconnect in Upload-Post

X (Twitter) Account Locked

Go to twitter.com or x.com and log in

Follow the prompts to unlock your account (may require phone verification)

Once unlocked, reconnect in Upload-Post

YouTube Account Suspended

Go to YouTube and sign in

Check the YouTube Help Center for suspension appeals

Follow YouTube's process to restore your account

Instagram Restricted

Open the Instagram app and log in

Look for any notification banners or prompts

Follow Instagram's instructions to verify your identity

After restrictions are lifted, reconnect in Upload-Post

:::warning
Upload-Post cannot bypass platform restrictions. You must resolve these issues directly with the social media platform before reconnecting.
:::

Configuration & Permissions {#configuration-permissions}

These errors occur when your account is connected but requires additional configuration or permissions.

Common Configuration Errors

| Error Message | Platform | Solution |
|---------------|----------|----------|
| "No Facebook Pages found for your account" | Facebook | Connect a Facebook Page (personal profiles not supported) |
| "Multiple Facebook Pages found. Please select a Page" | Facebook | Select which Page to post to |
| "Facebook Page ID is required for text posts" | Facebook | Configure your profile to select a Page |
| "Couldn't get a Facebook Page access token for Page ID..." | Facebook | Reconnect with proper Page permissions |
| "Pinterest account not found or not configured" | Pinterest | Configure Pinterest in your profile |
| "Board not found" | Pinterest | Select a valid Pinterest board |
| "You are not permitted to access that resource" | Various | Check your role/permissions on the account |
| "This site doesn't allow you to save Pins" | Pinterest | The target site blocks Pinterest pins |

How to Fix Configuration Errors

Facebook Page Issues

Facebook requires you to post to a Facebook Page, not a personal profile. The Facebook API does not support posting to personal profiles.

Create a Facebook Page (if you don't have one):

Go to Create a Page

Follow the setup wizard

Connect your Page to Upload-Post:

Go to Manage Users

Disconnect your Facebook account

Reconnect and select the Page you want to post to

Make sure you have Admin or Editor role on the Page

Select the correct Page in your profile:

Go to your Upload-Post profile settings

Select the Facebook Page from the dropdown

:::info Required Permissions
To post to a Facebook Page, you need:

Admin or Editor role on the Page

Grant "pages\_manage\_posts" permission during connection

Grant "pages\_read\_engagement" permission
:::

Pinterest Board Issues

Make sure you have at least one board in your Pinterest account

Go to your Upload-Post profile and select the correct board

If the board was recently created, try disconnecting and reconnecting Pinterest

Content Format {#content-format}

These errors occur when your media doesn't meet the platform's requirements for size, format, or aspect ratio.

Common Content Errors

| Error Message | Platform | Solution |
|---------------|----------|----------|
| "Unsupported image size" | Various | Use supported dimensions |
| "Invalid image aspect ratio" | Instagram | Use ratio between 4:5 and 1.91:1 |
| "Video longer than 2 minutes" | X (Twitter) | Shorten video or upgrade X account |
| "TikTok rejected the media format" | TikTok | Use MP4/MOV format |
| "One or more tags are invalid" | Various | Remove special characters from tags |
| "Your post must contain post flair" | Reddit | Add required flair to your post |
| "Media could not be fetched from the provided URL" | Various | Use a publicly accessible URL |
| "Downloaded file is too small" | Various | Check URL points to valid media |
| "Collaborator usernames are invalid" | Instagram | Use valid public usernames without @ |

Media Requirements by Platform

| Platform | Image Format | Max Image Size | Video Format | Max Video Duration |
|----------|--------------|----------------|--------------|-------------------|
| Instagram | JPG, PNG | 8 MB | MP4, MOV | 60 min (Feed), 90 sec (Reels) |
| Facebook | JPG, PNG, GIF | 10 MB | MP4, MOV | 240 min |
| TikTok | - | - | MP4, MOV | 10 min |
| X (Twitter) | JPG, PNG, GIF | 5 MB | MP4 | 2 min 20 sec\* |
| LinkedIn | JPG, PNG | 8 MB | MP4 | 10 min |
| YouTube | - | - | MP4, MOV, AVI | 12 hours |
| Pinterest | JPG, PNG | 32 MB | MP4, MOV | 15 min |

\*X Premium users may have longer video limits

Instagram Aspect Ratio Guidelines

Square: 1:1

Portrait: 4:5 (recommended for Feed)

Landscape: 1.91:1

Stories/Reels: 9:16

Images outside the 4:5 to 1.91:1 range will be rejected.

:::tip
For best results, use 1080x1350 pixels (4:5 ratio) for Instagram feed posts.
:::

Fixing Media URL Issues

If you're getting "Media could not be fetched" errors:

Check the URL is publicly accessible - Open it in an incognito browser window

Don't use private/restricted URLs - Google Drive links must be set to "Anyone with the link"

Use direct file URLs - The URL should end with a file extension like .jpg or .mp4

Check file size - Very small files (< 1KB) often indicate a broken link

Rate Limits {#rate-limits}

These errors occur when you've hit posting limits or the platform is experiencing temporary issues.

Common Rate Limit Errors

| Error Message | Platform | Solution |
|---------------|----------|----------|
| "Daily upload limit exceeded for this channel" | YouTube | Wait until tomorrow (UTC midnight) |
| "Service Unavailable (503)" | Various | Retry in a few minutes |
| "Temporary issue. We retried 4 times but it still failed" | Instagram | Platform issue - retry later |
| "Fatal" / "Unexpected error" | Various | Platform issue - retry later |
| "Rate limit reached" | Various | Wait before making more requests |

Platform Daily Limits

| Platform | Daily Posting Limit |
|----------|---------------------|
| Instagram | ~50 posts per day |
| TikTok | 15-20 videos per day |
| LinkedIn | ~150 posts per day |
| Pinterest | 25 pins per day |
| Reddit | Varies by subreddit |
| YouTube | 100 videos per day |

Handling Rate Limits

Wait and retry - Most limits reset at midnight UTC

Spread posts throughout the day - Avoid posting many items at once

Use scheduling - Schedule posts to spread them out automatically

Check your usage - View your posting history to track activity

:::info Automatic Rescheduling
When you hit a daily limit, Upload-Post may automatically reschedule your post for the next day. Check your scheduled posts to confirm.
:::

Getting Help

If your error isn't listed here or you need additional assistance:

Check our FAQ for general questions

Review our API Error Handling Guide for technical details

Contact support at info@upload-post.com

When contacting support, please include:

The exact error message you received

The platform you were posting to

The type of content (text, photo, video)

When the error occurred

Platform Help Centers

If you need to resolve issues directly with a social media platform:

Facebook Help Center

Instagram Help Center

TikTok Support

YouTube Help

X (Twitter) Help

LinkedIn Help

Pinterest Help

Reddit Help

--- END OF docs/resources/common-errors.md ---


--- START OF docs/resources/faq.md ---

Frequently Asked Questions

General Questions

What is Upload-Post?

Upload-Post is an API service that allows you to upload content to TikTok and Instagram programmatically. It simplifies the process of managing your social media content through a simple REST API.

How do I get started?

Create an account at upload-post.com

Connect your TikTok and Instagram accounts

Generate your API key

Start making API calls using our documentation

What platforms are supported?

Currently, we support TikTok for video uploads and Instagram for photo uploads. We're working on adding more platforms in the future.

Pricing & Plans

What's included in the free tier?

The free tier includes:

10 uploads per month

Basic API access

Standard support

How do I upgrade my plan?

You can upgrade your plan through the dashboard. Visit upload-post.com/pricing for more information.
s

Account & Security

How do I reset my API key?

You can generate a new API key from your dashboard. The old key will be invalidated immediately.

How do I revoke access to my social media accounts?

You can revoke access through your dashboard or by contacting our support team.

Is my data secure?

Yes, we use industry-standard encryption and security practices to protect your data and API keys.

Support

How do I get help?

Email: info@upload-post.com

Documentation: Check our guides

Do you offer technical support?

Yes, we offer technical support for all paid plans. Free tier users can access our community support.

--- END OF docs/resources/faq.md ---


--- START OF docs/resources/support.md ---

Support

We're here to help you succeed with the Upload-Post API. Here are the different ways you can get support:

Contact Options

Email Support

Support: info@upload-post.com

Community Support

Follow us on Twitter

Check our GitHub repository

Getting Help

Before Contacting Support

Check our documentation

Review our FAQ

Search for similar issues in our GitHub issues

When Contacting Support

Please include:

Your API key (masked)

Error messages or logs

Steps to reproduce the issue

Expected vs actual behavior

Any relevant code snippets

Bug Reports

If you've found a bug:

Check if it's already reported on GitHub

Create a new issue with:

Clear description

Steps to reproduce

Expected behavior

Actual behavior

Environment details

Feature Requests

We welcome feature requests! Submit them through:

GitHub issues

Email to info@upload-post.com

--- END OF docs/resources/support.md ---


--- START OF docs/sdk-examples.md ---

SDK Examples

Explore real-world examples using the Upload Post SDK in Python and JavaScript.

PyPI version
npm version

cURL

Upload Video

Upload Photos

Python

Basic Upload

JavaScript/Node.js

Basic Upload

--- END OF docs/sdk-examples.md ---


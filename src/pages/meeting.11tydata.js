// /meeting/ is built only once meeting.json says published: true (the same gate as
// /36-principles-meeting.ics). Until then there is no page to find, link to or index.
export default {
  eleventyComputed: {
    permalink: (data) => (data.meeting && data.meeting.published ? "/meeting/" : false),
  },
};

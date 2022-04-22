module.exports = [
  {
    fn: function (url) {
      if (url === "https://cloud-preview.d.xiaomi.net/user_info") {
        return {
          statusCode: 200,
          headers: {
            "Content-Type": "application/json",
          },
          body: `{"bgbu":"false","name":"hexiangxx1"}`,
        };
      }
      return false;
    },
  },
];

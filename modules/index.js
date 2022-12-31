let User = syzoj.model('user');
let Article = syzoj.model('article');
let Contest = syzoj.model('contest');
let Problem = syzoj.model('problem');
let Divine = syzoj.lib('divine');
let TimeAgo = require('javascript-time-ago');
let zh = require('../libs/timeago');
TimeAgo.locale(zh);
const timeAgo = new TimeAgo('zh-CN');

app.get('/', async (req, res) => {
  try {
    let ranklist = await User.queryRange([1, syzoj.config.page.ranklist_index], { is_show: true }, {
      [syzoj.config.sorting.ranklist.field]: syzoj.config.sorting.ranklist.order
    });
    await ranklist.forEachAsync(async x => x.renderInformation());

    let notices = (await Article.find({
      where: { is_notice: true }, 
      order: { public_time: 'DESC' }
    })).map(article => ({
      title: article.title,
      url: syzoj.utils.makeUrl(['article', article.id]),
      date: syzoj.utils.formatDate(article.public_time, 'L')
    }));

    let fortune = null;
    if (res.locals.user && syzoj.config.divine) {
      fortune = Divine(res.locals.user.username, res.locals.user.sex);
    }

    let contests = await Contest.queryRange([1, 5], { is_public: true }, {
      start_time: 'DESC'
    });

    let problems = (await Problem.queryRange([1, 5], { is_public: true }, {
      publicize_time: 'DESC'
    })).map(problem => ({
      id: problem.id,
      title: problem.title,
      time: timeAgo.format(new Date(problem.publicize_time)),
    }));

    res.render('index', {
      ranklist: ranklist,
      notices: notices,
      fortune: fortune,
      contests: contests,
      problems: problems,
      links: syzoj.config.links
    });
  } catch (e) {
    syzoj.log(e);
    res.render('error', {
      err: e
    });
  }
});

app.get('/dev', async (req, res) => {
  try {
    // let ranklist = await User.queryRange([1, syzoj.config.page.ranklist_index], { is_show: true }, {
    //   [syzoj.config.sorting.ranklist.field]: syzoj.config.sorting.ranklist.order
    // });
    // await ranklist.forEachAsync(async x => x.renderInformation());

    let notices = await Article.queryRange([1, 5], { is_notice: true }, {
      public_time: 'DESC'
    });

    await notices.forEachAsync(async notice => {
        await notice.loadRelationships();
        notice.allowedEdit = await notice.isAllowedEditBy(res.locals.user);
        notice.allowedComment = await notice.isAllowedCommentBy(res.locals.user);
        notice.content = await syzoj.utils.markdown(notice.content);
    });

    // let fortune = null;
    // if (res.locals.user && syzoj.config.divine) {
    //   fortune = Divine(res.locals.user.username, res.locals.user.sex);
    // }

    let now_time = syzoj.utils.getCurrentDate();

    let contests = await Contest.createQueryBuilder()
    .where("is_public = true")
    .andWhere("end_time > :now",{ now: now_time - 2592000 })
    .orderBy("start_time","DESC")
    .take(10)
    .getMany();

    let problems = await Problem.createQueryBuilder()
    .where("is_public = true")
    .orderBy("publicize_time","DESC")
    .take(7)
    .getMany();

    await problems.forEachAsync(async problem => {
      await problem.loadRelationships();
    })

    // 检索用户所有题的提交结果，以生成热力图
    let query = Problem.createQueryBuilder();
    if (!res.locals.user || !await res.locals.user.hasPrivilege('manage_problem')) {
      if (res.locals.user) {
        query.where('is_public = 1')
             .orWhere('user_id = :user_id', { user_id: res.locals.user.id });
      } else {
        query.where('is_public = 1');
      }
    }
    
    let hot_feed = await query.getMany();

    await hot_feed.forEachAsync(async problem => {
      problem.judge_state = await problem.getJudgeState(res.locals.user, true);
    });

    let me = res.locals.user;
    if(me){
      me.ac_problems = await me.getACProblems();
    }

    res.render('nextindex', {
      // ranklist: ranklist,
      notices: notices,
      // fortune: fortune,
      contests: contests,
      problems: problems,
      hot_feed: hot_feed,
      links: syzoj.config.links,
      me: me,
    });
  } catch (e) {
    syzoj.log(e);
    res.render('error', {
      err: e
    });
  }
});

app.get('/help', async (req, res) => {
  try {
    res.render('help');
  } catch (e) {
    syzoj.log(e);
    res.render('error', {
      err: e
    });
  }
});

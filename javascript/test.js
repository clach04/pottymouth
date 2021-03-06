$(document).ready(function (){
  var p = new PottyMouth(
    ['www.mysite.com', 'mysite.com'], // url_check_domains
    [/https?:\/\/mysite\.com\/allowed\/service/, /https?:\/\/mysite\.com\/safe\/url/] // url_white_lists
  );
  p.expose_internals_for_tests();

  test("PottyMouth basic tests", 2, function () {
    equals(true, true, "Testing is working");
    ok(p, "PottyMouth not found");
  });

  test("PottyMouth RegExp tests", 15, function () {
    ok( 'http://'.match(p.protocol_pattern), "protocol_pattern match");
    ok(! 'http//'.match(p.protocol_pattern), "protocol_pattern non-match");
    ok( 'google.de'.match(p.domain_pattern), "domain_pattern match");
    ok(! 'google.d'.match(p.domain_pattern), "domain_pattern non-match");

    ok('http://username:password@theory.org'.match(p.URI_pattern), "URI_pattern w/authentication");
    ok('www.theory.org'.match(p.URI_pattern), "URI_pattern www.");
    ok('http://username:password@theory.org/my/path'.match(p.URI_pattern), "URI_pattern w/authentication and path");
    ok('www.theory.org/py/math'.match(p.URI_pattern), "URI_pattern www. and path");

    ok('http://look.at/my?finger=middle&nail=clipped#cuticle'.match(p.URI_pattern), "URI_pattern w/ query parameters");

    ok('potty.mouth@theory.org'.match(p.email_pattern), "email pattern");
    ok('http://look.at/my/image.jpeg'.match(p.image_pattern), "image pattern");

    ok('http://www.youtube.com/watch?v=KKTDRqQtPO8'.match(p.youtube_pattern), "youtube pattern");
    ok('http://www.youtube.com/v/KKTDRqQtPO8'.match(p.youtube_pattern), "youtube pattern");
    ok('http://youtube.com/watch?v=KKTDRqQtPO8'.match(p.youtube_pattern), "youtube pattern");
    ok('http://youtube.com/v/KKTDRqQtPO8'.match(p.youtube_pattern), "youtube pattern");
  });

  test("PottyMouth replacer tests", 2, function () {
    equals(p.pre_replace('Foo "and" bar and ``baz\'\' or not.'), 'Foo &#8220;and&#8221; bar and &#8220;baz&#8221; or not.');
    equals(p.pre_replace('9\'13"and some arcseconds.'), '9&#8217;13&#34;and some arcseconds.');
  });

  test("PottyMouth tokenizer tests", 10, function () {
    var tstr = p.tokenize('A *BOLD* thing');
    equals(tstr[0].content, 'A ');
    equals(tstr[1].content, '*');
    equals(tstr[2].content, 'BOLD');
    equals(tstr[3].content, '* ');
    equals(tstr[4].content, 'thing');
    equals(tstr[0].name, 'TEXT');
    equals(tstr[1].name, 'STAR');
    equals(tstr[2].name, 'TEXT');
    equals(tstr[3].name, 'ITEMSTAR');
    equals(tstr[4].name, 'TEXT');
  });

  var helper = function(generated, expected, test_name) {
    if (generated != expected) {
      console.debug(generated.replace(/ /g, '_'));
      console.debug(expected.replace(/ /g, '_'));
    }
    return equals(generated, expected, test_name);
  }

  test("PottyMouth parser tests", 57, function () {
    equals(p.parse('This should be a URL http://mysite.com/allowed/service but this should not be http://mysite.COM/something/dangerous. And finally, these two should also be allowed http://mysite.com/safe/url and http://another.site.com/something/else.').toString(),
      '<div>\n  <p>\n    This should be a URL \n    <a href="http://mysite.com/allowed/service">mysite.com/allowed/service</a>\n     but this should not be http://mysite.COM/something/dangerous. And finally, these two should also be allowed \n    <a href="http://mysite.com/safe/url">mysite.com/safe/url</a>\n     and \n    <a href="http://another.site.com/something/else" class="external">another.site.com/something/else</a>\n    .\n  </p>\n</div>',
      'test_allowed_and_disallowed_urls');
    equals(p.parse('>>>> a very very deep quote\n>> not so deep of a quote\n>>> middle of the road\n> deatherly quotingly\n').toString(),
      '<div>\n  <blockquote>\n    <blockquote>\n      <blockquote>\n        <blockquote>\n          <p>\n            a very very deep quote\n          </p>\n        </blockquote>\n      </blockquote>\n      <p>\n        not so deep of a quote\n      </p>\n      <blockquote>\n        <p>\n          middle of the road\n        </p>\n      </blockquote>\n    </blockquote>\n    <p>\n      deatherly quotingly\n    </p>\n  </blockquote>\n</div>',
      'test_alternating_quote_depth');

    // This output is different from the python output because of the way encoding and escaping works
    equals(p.parse('<a href="spleengrokes@email.com" target="_blank">Contact Me</a>').toString(),
      '<div>\n  <p>\n    &lt;a href=&#8220;\n    <a href="mailto:spleengrokes@email.com" class="external">spleengrokes@email.com</a>\n    &#8221; target="_blank"&gt;Contact Me&lt;/a&gt;\n  </p>\n</div>',
      'test_attempted_HTML_insertion');

    equals(p.parse('*this is just a leading star').toString(),
      '<div>\n  <p>\n    *this is just a leading star\n  </p>\n</div>',
      'test_bare_leading_star');
    equals(p.parse("\nitem one\nitem two\nitem three\nSee, wasn't that easy?").toString(),
      '<div>\n  <p>\n    item one \n    <br />\n    item two \n    <br />\n    item three \n    <br />\n    See, wasn&#8217;t that easy?\n  </p>\n</div>',
      'test_beginning_paragraph_list');
    equals(p.parse('***just a bold***').toString(),
      '<div>\n  <p>\n    <b>\n      just a bold\n    </b>\n  </p>\n</div>',
      'test_bold');
    equals(p.parse('*bold http://www.theory.org/ URL * and _italic http://www.theory.org/ URL_ and *http://www.theory.org extra stuff*').toString(),
      '<div>\n  <p>\n    <b>\n      bold \n      <a href="http://www.theory.org/" class="external">www.theory.org/</a>\n       URL\n    </b>\n    and \n    <i>\n      italic \n      <a href="http://www.theory.org/" class="external">www.theory.org/</a>\n       URL\n    </i>\n     and \n    <b>\n      <a href="http://www.theory.org" class="external">www.theory.org</a>\n       extra stuff\n    </b>\n  </p>\n</div>',
      'test_bold_urls');
    equals(p.parse('Hello this is a list:\n\n \u2022 item is here\n \u2022 item has some  stuff\n \u2022 item is really long and it just goes on for a while, longer than fifty characters and more of item #77\n\nAnd no more of the list.\n     ').toString(),
      '<div>\n  <p>\n    Hello this is a list:\n  </p>\n  <ul>\n    <li>\n      item is here\n    </li>\n    <li>\n      item has some  stuff\n    </li>\n    <li>\n      item is really long and it just goes on for a while, longer than fifty characters and more of item #77\n    </li>\n  </ul>\n  <p>\n    And no more of the list.\n  </p>\n</div>',
      'test_bulleted_list');
    equals(p.parse('Hello this is a list:\n\n - item is here\n - item has some  stuff\n - item is really long and it just goes on for a while, longer than fifty characters and more of item #77\n\nAnd no more of the list. ').toString(),
      '<div>\n  <p>\n    Hello this is a list:\n  </p>\n  <ul>\n    <li>\n      item is here\n    </li>\n    <li>\n      item has some  stuff\n    </li>\n    <li>\n      item is really long and it just goes on for a while, longer than fifty characters and more of item #77\n    </li>\n  </ul>\n  <p>\n    And no more of the list.\n  </p>\n</div>',
      'test_dashed_list');
    equals(p.parse("\nHost:     Braig Crozinsky\nLocation: Braig's Pad\n         666 Mareclont Avenue, Apt. 6\n         Loakand, CA 94616 US\n         View Map\nWhen:     Saturday, November 7, 4:30PM\nPhone:    530-555-1212\n").toString(),
      '<div>\n  <dl>\n    <dt>Host:</dt>\n    <dd>\n      Braig Crozinsky\n    </dd>\n    <dt>Location:</dt>\n    <dd>\n      Braig&#8217;s Pad 666 Mareclont Avenue, Apt. 6 Loakand, CA 94616 US View Map\n    </dd>\n    <dt>When:</dt>\n    <dd>\n      Saturday, November 7, 4:30PM\n    </dd>\n    <dt>Phone:</dt>\n    <dd>\n      530-555-1212\n    </dd>\n  </dl>\n</div>',
      'test_definition_list');
    equals(p.parse('> early in the quote\n>>>> deep in the quote\nnot quoted at all\n').toString(),
      '<div>\n  <blockquote>\n    <p>\n      early in the quote\n    </p>\n    <blockquote>\n      <blockquote>\n        <blockquote>\n          <p>\n            deep in the quote\n          </p>\n        </blockquote>\n      </blockquote>\n    </blockquote>\n  </blockquote>\n  <p>\n    not quoted at all\n  </p>\n</div>',
      'test_early_deep_quote')
    equals(p.parse('what... I think... nevermind.').toString(),
      '<div>\n  <p>\n    what&#8230; I think&#8230; nevermind.\n  </p>\n</div>',
      'test_ellipses');
    equals(p.parse("this is someone's e.mail@email.com address").toString(),
      '<div>\n  <p>\n    this is someone&#8217;s \n    <a href="mailto:e.mail@email.com" class="external">e.mail@email.com</a>\n     address\n  </p>\n</div>',
      'test_email_hyperlink');
    equals(p.parse('Whatever happened -- I wondered -- to Illimunated-Distributed Motherf----ers?').toString(),
      '<div>\n  <p>\n    Whatever happened &#8212; I wondered &#8212; to Illimunated-Distributed Motherf&#8212;&#8212;ers?\n  </p>\n</div>',
      'test_emdashes');
    equals(p.parse('This paragraph has a list embedded in the middle of itself:\nitem one\nitem two\nitem thre\n').toString(),
      '<div>\n  <p>\n    This paragraph has a list embedded in the middle of itself: \n    <br />\n    item one \n    <br />\n    item two \n    <br />\n    item thre\n  </p>\n</div>',
      'test_end_paragraph_list');
    equals(p.parse('Oh my "Gosh," said \'Jonah\' and \'Tom.\' This "Shure" isn\'t my idea of Quotes.').toString(),
      '<div>\n  <p>\n    Oh my &#8220;Gosh,&#8221; said &#8216;Jonah&#8217; and &#8216;Tom.&#8217; This &#8220;Shure&#8221; isn&#8217;t my idea of Quotes.\n  </p>\n</div>',
      'test_fancy_curly_quotes');
    equals(p.parse('\nThis paragraph is classic and typical evidence of why the process of hard text\nwrapping\nwas ultimately a short-sighted practice that was deeply, wholly and firmly\ngrounded\nin complete idiocy, sincerely stupid and fallacious techniques and practices\nof programming.\n').toString(),
      '<div>\n  <p>\n    This paragraph is classic and typical evidence of why the process of hard text wrapping was ultimately a short-sighted practice that was deeply, wholly and firmly grounded in complete idiocy, sincerely stupid and fallacious techniques and practices of programming.\n  </p>\n</div>',
      'test_hard_text_wrapped_paragraph');
    equals(p.parse('go to www.google.com but not ww.goggle.com nor goggoil.com nor gar.goyle.com').toString(),
      '<div>\n  <p>\n    go to \n    <a href="http://www.google.com" class="external">www.google.com</a>\n     but not ww.goggle.com nor goggoil.com nor gar.goyle.com\n  </p>\n</div>',
      'test_identification_of_URLs_beginning_with_www');
    equals(p.parse('And shit, this http://www.theory.org/~matt/matt-1.jpg is an image.').toString(),
      '<div>\n  <p>\n    And shit, this \n    <img src="http://www.theory.org/~matt/matt-1.jpg" />\n     is an image.\n  </p>\n</div>',
      'test_image_hyperlink');
    equals(p.parse('* line 1\n* >> quoted item 2\n* satan\n\nparagraph not quoted paragraphy\n').toString(),
      '<div>\n  <ul>\n    <li>\n      line 1\n    </li>\n    <li>\n      &gt;&gt;quoted item 2\n    </li>\n    <li>\n      satan\n    </li>\n  </ul>\n  <p>\n    paragraph not quoted paragraphy\n  </p>\n</div>',
      'test_list_containing_blockquote');
    equals(p.parse('\n> * quoted item 2\n> * quoted item 3\n').toString(),
      '<div>\n  <blockquote>\n    <ul>\n      <li>\n        quoted item 2\n      </li>\n      <li>\n        quoted item 3\n      </li>\n    </ul>\n  </blockquote>\n</div>',
      'test_list_containing_blockquotes_2');
    equals(p.parse('* item\n* > item quote\n* > butta\n\nparagraph damage\n').toString(),
      '<div>\n  <ul>\n    <li>\n      item\n    </li>\n    <li>\n      &gt;item quote\n    </li>\n    <li>\n      &gt;butta\n    </li>\n  </ul>\n  <p>\n    paragraph damage\n  </p>\n</div>',
      'test_list_containing_two_quotes');
    equals(p.parse('Hello this is a list:\n\n * item is here\n * item has some  stuff\n * item is really long and it just goes on for a while, longer than fifty characters and more of item #77\n\nAnd no more of the list.\n     ').toString(),
      '<div>\n  <p>\n    Hello this is a list:\n  </p>\n  <ul>\n    <li>\n      item is here\n    </li>\n    <li>\n      item has some  stuff\n    </li>\n    <li>\n      item is really long and it just goes on for a while, longer than fifty characters and more of item #77\n    </li>\n  </ul>\n  <p>\n    And no more of the list.\n  </p>\n</div>',
      'test_list_with_long_line');
    equals(p.parse("\n> Host:     Braig Crozinsky\n> Location: Braig's Pad\n>    666 Mareclont Avenue, Apt. 6\n>       Loakand, CA 94616 US\n>View Map\n>  When: Neptuday, Pentember 37th, 4:90PM\n>Phone:    530-555-1212\n").toString(),
      '<div>\n  <blockquote>\n    <dl>\n      <dt>Host:</dt>\n      <dd>\n        Braig Crozinsky\n      </dd>\n      <dt>Location:</dt>\n      <dd>\n        Braig&#8217;s Pad 666 Mareclont Avenue, Apt. 6 Loakand, CA 94616 US\n      </dd>\n    </dl>\n    <p>\n      View Map\n    </p>\n    <dl>\n      <dt>When:</dt>\n      <dd>\n        Neptuday, Pentember 37th, 4:90PM\n      </dd>\n      <dt>Phone:</dt>\n      <dd>\n        530-555-1212\n      </dd>\n    </dl>\n  </blockquote>\n</div>',
      'test_messy_quoted_definition_list');
    equals(p.parse("This paragraph has a list embedded in the middle of itself:\nitem one\nitem two\nitem three\nSee, wasn't that easy?").toString(),
      '<div>\n  <p>\n    This paragraph has a list embedded in the middle of itself: \n    <br />\n    item one \n    <br />\n    item two \n    <br />\n    item three \n    <br />\n    See, wasn&#8217;t that easy?\n  </p>\n</div>',
      'test_mid_paragraph_list');
    equals(p.parse('but *I dunno _what* this_ is *supposed to* be.').toString(),
      '<div>\n  <p>\n    but \n    <b>\n      I dunno _what\n    </b>\n    this_ is \n    <b>\n      supposed to\n    </b>\n    be.\n  </p>\n</div>',
      'test_mis_nested_bold_and_italic');
    equals(p.parse('\n> Bubba\n\n> * quoted item 2\n> * quoted item 3\n\n> Toady\n').toString(),
      '<div>\n  <blockquote>\n    <p>\n      Bubba\n    </p>\n  </blockquote>\n  <blockquote>\n    <ul>\n      <li>\n        quoted item 2\n      </li>\n      <li>\n        quoted item 3\n      </li>\n    </ul>\n  </blockquote>\n  <blockquote>\n    <p>\n      Toady\n    </p>\n  </blockquote>\n</div>',
      'test_multiple_blockquotes_containing_list');
    equals(p.parse('this is *bold _and italic *and I dunno* what_ this* is.').toString(),
      '<div>\n  <p>\n    this is \n    <b>\n      bold _and italic\n    </b>\n    and I dunno\n    <b>\n      what_ this\n    </b>\n    is.\n  </p>\n</div>',
      'test_nested_bold_and_italic');
    equals(p.parse("About Smuggler's Cove: Nothing").toString(),
      '<div>\n  <p>\n    About Smuggler&#8217;s Cove: Nothing\n  </p>\n</div>',
      'test_not_actually_a_definiton_list');
    equals(p.parse('**the Higgs Boson is not bold**').toString(),
      '<div>\n  <p>\n    the Higgs Boson is not bold\n  </p>\n</div>',
      'test_not_bold');
    equals(p.parse('This is a list:\n    1) One\n    2) Too\n    7.) Tree\n    ').toString(),
      '<div>\n  <p>\n    This is a list:\n  </p>\n  <ol>\n    <li>\n      One\n    </li>\n    <li>\n      Too\n    </li>\n    <li>\n      Tree\n    </li>\n  </ol>\n</div>',
      'test_numbered_list_parentheses');
    equals(p.parse('Hello this is a list:\n\n 1. item #1 is #1!\n 2. item #2 has some  stuff\n 77. item #77 is really long and it just goes on for a while, longer than fifty characters and more of item #77\n\nAnd no more of the list.\n     ').toString(),
      '<div>\n  <p>\n    Hello this is a list:\n  </p>\n  <ol>\n    <li>\n      item #1 is #1!\n    </li>\n    <li>\n      item #2 has some  stuff\n    </li>\n    <li>\n      item #77 is really long and it just goes on for a while, longer than fifty characters and more of item #77\n    </li>\n  </ol>\n  <p>\n    And no more of the list.\n  </p>\n</div>',
      'test_numbered_list_periods');
    equals(p.parse('A paragraph separated from the next one with a line\n\t\nthat contains just a tab becomes two paragraphs\n').toString(),
      '<div>\n  <p>\n    A paragraph separated from the next one with a line\n  </p>\n  <p>\n    that contains just a tab becomes two paragraphs\n  </p>\n</div>',
      'test_only_tabspace_line');
    equals(p.parse('A paragraph separated from the next one with a line\n    \nthat contains just some whitespace becomes two paragraphs\n').toString(),
      '<div>\n  <p>\n    A paragraph separated from the next one with a line\n  </p>\n  <p>\n    that contains just some whitespace becomes two paragraphs\n  </p>\n</div>',
      'test_only_whitespace_line');
    equals(p.parse('\nBubba\n* quoted item 2\n* quoted item 3\nToady\n').toString(),
      '<div>\n  <p>\n    Bubba\n  </p>\n  <ul>\n    <li>\n      quoted item 2\n    </li>\n    <li>\n      quoted item 3\n    </li>\n  </ul>\n  <p>\n    Toady\n  </p>\n</div>',
      'test_paragraph_containing_list');
    equals(p.parse("\nBubba Gump\n\nFishing: in the ocean, yes, and sometimes in the deep blue sea\nHurricane: in the ocean, yes, and sometimes in the deep blue sea\n\nToady the Wild G-Frog's wild ride of a lifetime channel tunnel\n").toString(),
      '<div>\n  <p>\n    Bubba Gump\n  </p>\n  <dl>\n    <dt>Fishing:</dt>\n    <dd>\n      in the ocean, yes, and sometimes in the deep blue sea\n    </dd>\n    <dt>Hurricane:</dt>\n    <dd>\n      in the ocean, yes, and sometimes in the deep blue sea\n    </dd>\n  </dl>\n  <p>\n    Toady the Wild G-Frog&#8217;s wild ride of a lifetime channel tunnel\n  </p>\n</div>',
      'test_paragraphs_and_definition_list');
    equals(p.parse("\n> Bubba Gump\n>\n> Fishing: in the ocean, yes, and sometimes in the deep blue sea\n> Hurricane: in the ocean, yes, and sometimes in the deep blue sea\n>\n> Toady the Wild G-Frog's ride of a lifetime channel tunnel\n").toString(),
      '<div>\n  <blockquote>\n    <p>\n      Bubba Gump\n    </p>\n    <dl>\n      <dt>Fishing:</dt>\n      <dd>\n        in the ocean, yes, and sometimes in the deep blue sea\n      </dd>\n      <dt>Hurricane:</dt>\n      <dd>\n        in the ocean, yes, and sometimes in the deep blue sea\n      </dd>\n    </dl>\n    <p>\n      Toady the Wild G-Frog&#8217;s ride of a lifetime channel tunnel\n    </p>\n  </blockquote>\n</div>',
      'test_quote_containing_paragraph_containing_definition_list');
    equals(p.parse('\n> Bubba\n> * quoted item 2\n> * quoted item 3\n> Toady\n').toString(),
      '<div>\n  <blockquote>\n    <p>\n      Bubba\n    </p>\n    <ul>\n      <li>\n        quoted item 2\n      </li>\n      <li>\n        quoted item 3\n      </li>\n    </ul>\n    <p>\n      Toady\n    </p>\n  </blockquote>\n</div>',
      'test_quote_containing_paragraph_containing_list');
    equals(p.parse('You suck\n> no, you suck\n>> no, really, you suck\n>>> I told you, you are the sucky one\n> whatever you say\n\neat shit with your findegs\nthis iss also shit\n\neat shit some more ').toString(),
      '<div>\n  <p>\n    You suck\n  </p>\n  <blockquote>\n    <p>\n      no, you suck\n    </p>\n    <blockquote>\n      <p>\n        no, really, you suck\n      </p>\n      <blockquote>\n        <p>\n          I told you, you are the sucky one\n        </p>\n      </blockquote>\n    </blockquote>\n    <p>\n      whatever you say\n    </p>\n  </blockquote>\n  <p>\n    eat shit with your findegs \n    <br />\n    this iss also shit\n  </p>\n  <p>\n    eat shit some more\n  </p>\n</div>',
      'test_reply_reply_reply');
    equals(p.parse('\nThis is a reply to an reply\n> this is a reply\n> > this is the original\n> > and another original line\n> > aand yet ononther ariginal\n> >\n> > more of the original in a different paragraph\n> more of the reply\n>\n> even more reply\n> wow this just keeps going\nrest of the message\n\nno news \n').toString(),
      '<div>\n  <p>\n    This is a reply to an reply\n  </p>\n  <blockquote>\n    <p>\n      this is a reply\n    </p>\n    <blockquote>\n      <p>\n        this is the original \n        <br />\n        and another original line \n        <br />\n        aand yet ononther ariginal\n      </p>\n      <p>\n        more of the original in a different paragraph\n      </p>\n    </blockquote>\n    <p>\n      more of the reply\n    </p>\n    <p>\n      even more reply \n      <br />\n      wow this just keeps going\n    </p>\n  </blockquote>\n  <p>\n    rest of the message\n  </p>\n  <p>\n    no news\n  </p>\n</div>',
      'test_reply_to_a_reply');
    equals(p.parse('\nthis paragraph\nhas short\nlines so it\nshould get\nbreak tags\nall over the\nplace\n').toString(),
      '<div>\n  <p>\n    this paragraph \n    <br />\n    has short \n    <br />\n    lines so it \n    <br />\n    should get \n    <br />\n    break tags \n    <br />\n    all over the \n    <br />\n    place\n  </p>\n</div>',
      'test_short_lines');
    equals(p.parse('short line\nshort line\nshort line\na very very long line that surpasses the maximum short line length').toString(),
      '<div>\n  <p>\n    short line \n    <br />\n    short line \n    <br />\n    short line \n    <br />\n    a very very long line that surpasses the maximum short line length\n  </p>\n</div>',
      'test_short_then_long_line');
    equals(p.parse('*this is bold*').toString(),
      '<div>\n  <p>\n    <b>\n      this is bold\n    </b>\n  </p>\n</div>',
      'test_simple_bold');
    equals(p.parse('Hello this is a list:\n\n # item 1 is #1!\n # item 2 has some  stuff\n # item 3 is really long and it just goes on for a while, longer than fifty characters and more of item 3\n\nAnd no more of the list.\n     ').toString(),
      '<div>\n  <p>\n    Hello this is a list:\n  </p>\n  <ol>\n    <li>\n      item 1 is #1!\n    </li>\n    <li>\n      item 2 has some  stuff\n    </li>\n    <li>\n      item 3 is really long and it just goes on for a while, longer than fifty characters and more of item 3\n    </li>\n  </ol>\n  <p>\n    And no more of the list.\n  </p>\n</div>',
      'test_simple_list');
    equals(p.parse('\n> Bubba\n>\n> * quoted item 2\n> * quoted item 3\n>\n> Toady\n').toString(),
      '<div>\n  <blockquote>\n    <p>\n      Bubba\n    </p>\n    <ul>\n      <li>\n        quoted item 2\n      </li>\n      <li>\n        quoted item 3\n      </li>\n    </ul>\n    <p>\n      Toady\n    </p>\n  </blockquote>\n</div>',
      'test_single_blockquote_containing_list');
    equals(p.parse("\nHere is a _paragraph_ with big _fat_ looong text lines\nthat go *on and_ on* foreeeeeever with no end in sight.\n\nYes, that's right,  another paragraph. http://google.com/ is my site\nWill wonders ever cease?\n").toString(),
      '<div>\n  <p>\n    Here is a \n    <i>\n      paragraph\n    </i>\n     with big \n    <i>\n      fat\n    </i>\n     looong text lines that go \n    <b>\n      on and_ on\n    </b>\n    foreeeeeever with no end in sight.\n  </p>\n  <p>\n    Yes, that&#8217;s right,  another paragraph. \n    <a href=\"http://google.com/\" class=\"external\">google.com/</a>\n     is my site Will wonders ever cease?\n  </p>\n</div>',
      'test_some_paragraphs');
    equals(p.parse("Someone's ``being'' too `clever' with quotes.").toString(),
      '<div>\n  <p>\n    Someone&#8217;s &#8220;being&#8221; too &#8216;clever&#8217; with quotes.\n  </p>\n</div>',
      'test_too_clever_quotes');
    equals(p.parse('>>> this begins a deep quote\n>>> this ends a deep quote\n').toString(),
      '<div>\n  <blockquote>\n    <blockquote>\n      <blockquote>\n        <p>\n          this begins a deep quote \n          <br />\n          this ends a deep quote\n        </p>\n      </blockquote>\n    </blockquote>\n  </blockquote>\n</div>',
      'test_triple_deep_quote_by_itself');
    equals(p.parse('two short lines\nall by themselves\n').toString(),
      '<div>\n  <p>\n    two short lines \n    <br />\n    all by themselves\n  </p>\n</div>',
      'test_two_short_lines');
    equals(p.parse('\u1503@theory.org').toString(),
      '<div>\n  <p>\n    <a href="mailto:\u1503@theory.org" class="external">\u1503@theory.org</a>\n  </p>\n</div>',
      'test_unicode_email');
    equals(p.parse('http://www.youtube.com/v/PVY5IpSDUYE').toString(),
      '<div>\n  <p>\n    <object width="425" height="350">\n      <param name="movie" value="http://www.youtube.com/v/PVY5IpSDUYE"></param>\n      <param name="wmode" value="transparent"></param>\n      <embed type="application/x-shockwave-flash" wmode="transparent" src="http://www.youtube.com/v/PVY5IpSDUYE" width="425" height="350"></embed>\n    </object>\n  </p>\n</div>',
      'test_youtube_embed_1');
    equals(p.parse('http://www.youtube.com/watch?v=KKTDRqQtPO8').toString(),
      '<div>\n  <p>\n    <object width="425" height="350">\n      <param name="movie" value="http://www.youtube.com/v/KKTDRqQtPO8"></param>\n      <param name="wmode" value="transparent"></param>\n      <embed type="application/x-shockwave-flash" wmode="transparent" src="http://www.youtube.com/v/KKTDRqQtPO8" width="425" height="350"></embed>\n    </object>\n  </p>\n</div>',
      'test_youtube_embed_2');
    equals(p.parse('* \n').toString(),
      '<div>\n  <p>\n    *\n  </p>\n</div>',
      'stray_asterisk');
    equals(p.parse('This is a_lonely underscore').toString(),
      '<div>\n  <p>\n    This is a_lonely underscore\n  </p>\n</div>',
      'test_unbalanced_underscore');
    equals(p.parse('This is a*lonely asterisk').toString(),
      '<div>\n  <p>\n    This is a*lonely asterisk\n  </p>\n</div>',
      'test_unbalanced_asterisk');
    equals(p.parse('And now a descriptive list:\n\n1) I like to read books in the rain\n2) Number one sounds silly, I guess it is. I suppose a dry area\n  would be a better location.\n3) I suppose you wouldn\'t be surprised to hear I read newspapers\n  in the swimming pool.\n 4) Roger').toString(),
      '<div>\n  <p>\n    And now a descriptive list:\n  </p>\n  <ol>\n    <li>\n      I like to read books in the rain\n    </li>\n    <li>\n      Number one sounds silly, I guess it is. I suppose a dry area would be a better location.\n    </li>\n    <li>\n      I suppose you wouldn&#8217;t be surprised to hear I read newspapers in the swimming pool.\n    </li>\n    <li>\n      Roger\n    </li>\n  </ol>\n</div>',
      'test_indented_lists');
    equals(p.parse('Ben: a name consisting of two consonants and\n  one vowel\nEva: a name consisting of one consonant and\n  two vowels\nQi: Not a name at all\n').toString(),
      '<div>\n  <dl>\n    <dt>Ben:</dt>\n    <dd>\n      a name consisting of two consonants and one vowel\n    </dd>\n    <dt>Eva:</dt>\n    <dd>\n      a name consisting of one consonant and two vowels\n    </dd>\n    <dt>Qi:</dt>\n    <dd>\n      Not a name at all\n    </dd>\n  </dl>\n</div>',
      'test_indented_definitions');
  });
})

//refex.js 0.1
(function () {
    var ginf, //検索キーとするgene idとプロパティのオブジェクト
        g_infs = [], //ポートフォリオとして保持するデータ
        r_inf, //refex_idに紐づくデータデータセット
        r_infs = {}, // 取得したgene_ info＋r_infoをまとめたobject.gidをキーとする。
        s_inf = {}, // データセットを抜粋したオブジェクト
        slen = 20, // 抜粋するデータ長
        r = function(n){return Array.from(Array(n).keys())}, //range()メソッドの実装；
        endpoint = 'https://integbio.jp/rdf/sparql';


    // D3.js
    var info, chart, tbl, attr_info = {width: 450}, chart_info = {with: 400, height: 90, margin: 30, b:65, l:20, r:50 };

    /*
     * オートコンプリートの定義, summaryデータ取得
     */
    var org = $("[name=orgs]:checked").val(),
        target_data_set = './data/refex_gene_info_' + org + '.json';

    var gene_info = new Bloodhound({
        limit: 5,
        datumTokenizer: Bloodhound.tokenizers.obj.whitespace('value'),
        queryTokenizer: Bloodhound.tokenizers.whitespace,
        local: human
    });

    var query_refex_info = function (g) {
        return `
          PREFIX ncbi-gene:  <http://www.ncbi.nlm.nih.gov/gene/>
            PREFIX refexo: <http://purl.jp/bio/01/refexo#>
            PREFIX rdfs:  <http://www.w3.org/2000/01/rdf-schema#>
            SELECT DISTINCT ?refex ?sample ?expression_value ?sample_category
            WHERE {
            ?refex  rdfs:seeAlso ncbi-gene:${g};
            refexo:expValue ?expression_value;
            refexo:refexSample ?sample .
            ?sample refexo:refexSampleCategory ?sample_category .
            }`
    };

    // 選択した遺伝子のgene idでrefexの情報を取得
    function get_refex_info(gid) {
        var qs = encodeURIComponent(query_refex_info(gid));
        var q = endpoint + "?query=" + qs;
        d3.xml(q, function (error, xmlRoot) {
            r_inf = Array.from(xmlRoot.querySelectorAll('result'), function (x) {
                return x2obj(x)
            });
            summary_chart(ginf, summary_data(r_inf));
            store_data(ginf, r_inf);
        })
    }

    // NodeListをオブジェクトに変換
    function x2obj(x) {
        var item = {};
        item['refex'] = x.querySelectorAll('[name=refex]').item(0).textContent.split('/').pop();
        item['sample'] = x.querySelectorAll('[name=sample]').item(0).textContent.split('/').pop();
        //item['organism'] = x.querySelectorAll('[name=organism]').item(0).textContent.split('/').pop();//gene_idは主語とユニークなため不必要
        item['exp_val'] = x.querySelectorAll('[name=expression_value]').item(0).textContent;
        item['cat'] = x.querySelectorAll('[name=sample_category]').item(0).textContent;
        return item
    }

    //取得したオブジェクトを一時保存する
    function store_data(c, d){
        var i = c.gid;
        var a = [c, d];
        r_infs[i] = a;
    }

    // オートコンプリートを初期化
    gene_info.initialize();

    /*
     * barchart定義
     */

    //要約データ生成
    function summary_data(d){
        //dataをslenに分割したときの間隔nを取得
        n = parseInt(d.length / slen);
        s_inf = [];
        for(i in r(slen)){
            s_inf.push(d[i*n]);
        }
        return s_inf
    }

    //要約チャート生成
    function summary_chart(c, data){
        data.forEach(function (g) {
            g.exp_val = +d3.format(".2f")(g.exp_val);
        });

        // scale（d3v4 ordinal scale）
        var names = data.map(function(d){return d.sample}), // 抽出したサンプル名
            x = d3.scaleBand().rangeRound([0, chart_info.with]).paddingInner(0.05),
            y = d3.scaleLinear().range([chart_info.height, 0]);

        x.domain(names);
        y.domain([0, d3.max(data, function(d){return d.exp_val})]);

        // axis
        var xAxis = d3.axisBottom().scale(x).tickFormat(function (d,i ) {
            return d.slice(-4)
            }),
            yAxis = d3.axisLeft().scale(y).ticks(3);

        var profile = d3.select('.summary').append('div').attr('class', 'profile');

        //name, id, symbol
        profile.append('div')
            .attr("class", "info")
            .html(`<h2 class='name'>${c.name}</h2>
                    <div class="symbol">${c.symbol}</div> 
                    <div class="gid">gene id: <a href="https://www.ncbi.nlm.nih.gov/gene/${c.gid}">${c.gid}</a></div>
            `);

        // tableに"Add to List"するボタン
        profile.select('.info').append('div')
            .attr("id", c.gid)
            .attr("class", "add_list")
            .html(`<button type="button" class="btn btn-primary btn-sm">Add to List <span class="glyphicon glyphicon-plus"></span> </button>
            `)
            .on('click', function(){add_to_list(c)});

        // bar chart
        var svg = profile.append('svg').attr("class", "chart").attr("width", chart_info.with).attr("height", (chart_info.height + chart_info.b));

        svg.append("g").selectAll('.bar').data(data)
            .enter().append("rect")
            .attr("style", "fill:steelblue")
            .attr("x", function(d){return x(d.sample)})
            .attr("width",  x.bandwidth())
            .attr("y", function (d) {return y(d.exp_val)})
            .attr("height", function(d){return chart_info.height - y(d.exp_val)})
            .attr("transform", "translate("+ chart_info.l +","+ chart_info.margin +")");

        svg.append("g").append("text").attr('id', c.gid).attr('class', 'chart').text("summary").attr("transform", "translate(0, 12)");

        // axis
        svg.append("g").attr("class", "x axis").attr("transform", "translate("+ chart_info.l +","+ (chart_info.height + chart_info.margin) +")")
            .call(xAxis).selectAll("text").style("text-anchor", "end")
            .attr("dx", "-.8em").attr("dy", "-0.5em").attr("transform", "rotate(-90)");

        svg.append("g").attr("class", "y axis").attr("transform", "translate("+ chart_info.l +", "+ chart_info.margin +")").call(yAxis).append("text");

    }

    function add_to_list(d){
        //選択した遺伝子の情報をg_infsに追加

        //リストに無いidか評価し、無ければobjectを追加
        (g_infs.map(function (c) {return c.gid}).indexOf(d.gid) == -1) ? g_infs.push(d): "";

        tbl = d3.select("table.glist tbody").selectAll("tr").data(g_infs)
            .enter().append("tr");
        tbl.append("td").text(function(r){return r.name});
        tbl.append("td").text(function(r){return r.symbol});
        tbl.append("td").text(function(r){return r.gid});
        tbl.append("td").text(function(r){return r.organism});
        tbl.append("td").html(`<button type="button" class="btn btn-warning btn-xs">Remove from List <span class="glyphicon glyphicon-minus"></span></button>
        `)
        .on("click", function(){remove_from_list(d.gid)});

        if(!document.getElementById("lm")) show_learnmore_btn();
    }

    function remove_from_list(g){
        //選択された情報をobjectから削除する
        g_infs = g_infs.filter(function(d){return !(d.gid == g)});
        tbl = d3.select("table.glist tbody").selectAll("tr").data(g_infs)
            .exit().remove();
        tbl.append("td").text(function(r){return r.name});
        tbl.append("td").text(function(r){return r.symbol});
        tbl.append("td").text(function(r){return r.gid});
        tbl.append("td").text(function(r){return r.organism});
        tbl.append("td").html(`<button type="button" class="btn btn-warning btn-xs">Remove from List <span class="glyphicon glyphicon-minus"></span></button>
        `)
        .on("click", function(){remove_from_list(d.gid)});
    }

    // Learn more button
    function show_learnmore_btn() {
        d3.select("table.glist th.more").append("div")
            .attr("class", "learnmore")
            .html(`<button id="lm" type="button" class="btn btn-primary btn-xs">Learn more  <span class="glyphicon glyphicon-stats"></span></button>`)
            .on("click", function(){learn_more(selected_ids())})
    }

    function selected_ids(){
        //現在のlist中にあるgene_idを返す
        var g = g_infs.map(function(g){return g})
        return g
    }

    /*
    * 詳細チャート表示
     */

    function learn_more(g){
        items = r_infs.filter(function(r){
            return r
        });
        console.log(g);
        console.log(items)

    }


    /*
     * UIイベント定義
     */
    $('#refex .typehead').typeahead(null, {
        name: 'gene_info',
        display: 'value',
        source: gene_info.ttAdapter()
    });

    // radio buttonのイベント
    $('input').on('ifChecked', function (e) {
        //target_data_set = './data/refex_gene_info_' + this.value + '.json';
        target_data_set = eval(this.value);
        gene_info.clear();
        gene_info.local = target_data_set;
        gene_info.initialize(true);
    }).iCheck({
        checkboxClass: 'icheckbox_flat-blue',
        radioClass: 'iradio_flat-blue'
    });

    //選択した遺伝子の情報を取得し、idを引数にSPARQLエンドポイントをcall
    $('#refex .typehead').bind('typeahead:select', function (e, suggestion) {
        gid = suggestion.id;
        org = $("[name=orgs]:checked").val();
        ginf = {gid: gid, name: this.value, symbol: suggestion.Symbol, organism: org};
        get_refex_info(gid);

    });

    $("#refex .btn").click(function () {
        //var name = $('input.typehead.tt-input').val(); //gene name
        get_refex_info(gid);
    });


})();
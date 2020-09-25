//refex.js 0.1
(function () {
    get_all_sample();

    var ginf, //検索キーとするgene idとプロパティのオブジェクト
        g_infs = [], //ポートフォリオとして保持するデータ
        r_inf, //refex_idに紐づくデータデータセット
        r_infs = {}, // 取得したgene_ info＋r_infoをまとめたobject.gidをキーとする。
        s_r_infs = [], //選択されたchart描画のためのデータを持つrefex情報のarray
        s_inf = {}, // データセットを抜粋したオブジェクト
        slen = 10, // 抜粋するデータ長
        colors = d3.scaleOrdinal().range(["SteelBlue","#43359c", "#b03060", "Orange", "Olive", "Navy"]),
        r = function(n){return Array.from(Array(n).keys())}, //range()メソッドの実装；
        endpoint = 'https://integbio.jp/rdf/sparql';

    var container_width = document.getElementById('barchart').offsetWidth;
    // summary confs
    var tbl, chart_conf = {width: 400, height: 50, margin: 30, b:65, l:20, r:50 };
    // focus & context chart confs
    var bcnf = {width: (container_width - 240), height: 120, hide: 0 ,margin:30, t:8, b: 30, l:30, r: 30},
        ccnf = {h: 40, t:8, b: 30},
        xa = d3.scaleBand().range([0, bcnf.width - bcnf.l ]), // x scale for focused chart
        yb = d3.scaleLinear().range([bcnf.height, 0]),
        xc = d3.scaleBand().range([0, bcnf.width - bcnf.l ]), // x scale for context chart
        yc = d3.scaleLinear().range([ccnf.h, 0]),
        xs = d3.scaleBand().range([0, bcnf.width - bcnf.l ]);  // x scale for sorted chart
        //colors = d3.scaleOrdinal(d3.schemaCategory10), // color scale
        //C = d3.scaleOrdinal().range(["SlateGray","Silver", "RosyBrown", "Tan" ]),
        
    // bbchartを描画するsvgの設定。
    var svg = d3.select('#barchart .chart').append('svg').attr('class', 'bar_chart')
        .attr('width',bcnf.width).attr('height',(bcnf.hide));

    //svg.append("defs").append("clipPath").attr("id", "clip").append("rect")
        //.attr("width",bcnf.width).attr("height", bcnf.height);

    var focus = svg.append('g').attr('class', 'focus').attr('transform', 'translate('+ bcnf.l + ',' + bcnf.t + ')');
    var context = svg.append('g').attr('class', 'context').attr('transform', 'translate('+ bcnf.l + ',' + ( +bcnf.height + +bcnf.t + ccnf.t) + ')');
    //var exp = focus.append("g");

    var bbchart_info = d3.select('#barchart .info').append('div').attr('class', 'bbchart_info')
        .attr('width', 10).attr('style', 'left:'+ bcnf.width );

    var brush = d3.brushX()
        .extent([[0,0], [bcnf.width - bcnf.l, ccnf.h]])
        .on("end", brushed);

    var zoom = d3.zoom()
        .scaleExtent([1, Infinity])
        .translateExtent([0,0], [bcnf.width, bcnf.height])
        .extent([0,0], [bcnf.width, bcnf.height])
        .on('zoom', zoomed);

    var xAxisb = d3.axisBottom(xa).tickSize(0).tickFormat(''),
        //xAxisc = d3.axisBottom(xc).tickSize(2).tickValues(xc.domain().filter(function(d,i){return (i % 20) == 0})).tickFormat(function (d) {return d.slice(-4)}),
        xAxisc = d3.axisBottom(xc).tickSize(0).tickFormat(''),
        xAxiss = d3.axisBottom(xs).tickSize(2).tickValues(xc.domain().filter(function(d,i){return (i % 20) == 0})).tickFormat(function (d) {return d.slice(-4)}),
        yAxisb = d3.axisLeft(yb);

    /*
     * オートコンプリートの定義, summaryデータ取得
     */

    var org = $("[name=orgs]:checked").val();
        //target_data_set = './data/refex_gene_info_' + org + '.json';

    // bloodhoudオブジェクトを定義
    var gene_info = function(path){
      return new Bloodhound({
        limit: 15,
        datumTokenizer: Bloodhound.tokenizers.obj.whitespace('value'),
        queryTokenizer: Bloodhound.tokenizers.whitespace,
        prefetch: path
      })
    };

    var gene_info_human = gene_info('./data/refex_gene_human.json');
    var gene_info_mouse = gene_info('./data/refex_gene_mouse.json');

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

    // sample reference取得
    function get_sample_ref(sample){
        var item = sample_ref[sample];
        show_reference(item);
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
    //sample referenceをobjectに変換。不定長のオブジェクトにあらかじめ変形する。
    function s2obj(x){
        var item = {};
        item['cell'] = x.querySelectorAll('[name=cell]').item(0).textContent.split('/').pop();
        item['fantom'] = x.querySelectorAll('[name=fantom]').item(0).textContent.split('/').pop();
        item['disease'] = x.querySelectorAll('[name=disease]').item(0).textContent.split('/').pop();
        item['uberon'] = x.querySelectorAll('[name=uberon]').item(0).textContent.split('/').pop();
        return item;
    }

    //取得したオブジェクトを一時保存する
    function store_data(c, d){
        var i = c.gid;
        var a = [c, d];
        r_infs[i] = a;
    }

    // オートコンプリートを初期化
    gene_info_human.initialize();
    gene_info_mouse.initialize();

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

    //要約チャート・要約情報render
    function summary_chart(c, data){
        data.forEach(function (g) {
            g.exp_val = +d3.format(".2f")(g.exp_val);
        });

        // scale（d3v4 ordinal scale）
        var names = data.map(function(d){return d.refex}), // 抽出したサンプル名
            xs = d3.scaleBand().rangeRound([0, chart_conf.width]).paddingInner(0.05),
            ys = d3.scaleLinear().range([chart_conf.height, 0]);

        xs.domain(names);
        ys.domain([0, d3.max(data, function(d){return d.exp_val})]);
        // axis
        var xAxis = d3.axisBottom().scale(xs).tickFormat(function (d,i ) {
            return d.slice(-4)
            }),
            yAxis = d3.axisLeft().scale(ys).ticks(3);

        var profile = d3.select('.summary').append('div').attr('class', 'profile');

        //name, id, symbol
        var info = profile.append('div')
            .attr('class', 'info');

        info.append('h2')
            .attr('class', 'name')
            .text(c.name)
            .on('click', function(){learn_more([c.gid])});

        info.append('div')
            .attr("class", "info")
            .html(`
                    <div class="symbol">${c.symbol}</div> 
                    <div class="gid">gene id: <a href="https://www.ncbi.nlm.nih.gov/gene/${c.gid}">${c.gid}</a></div>
            `);

        // tableに"Add to List"するボタン
        info.append('div')
            .attr("id", c.gid)
            .attr("class", "add_list")
            .html(`<button type="button" class="btn btn-primary btn-xs">Add to List <span class="glyphicon glyphicon-plus"></span> </button>
            `)
            .on('click', function(){add_to_list(c)});

        // bar chart
        var svg = profile.append('svg').attr("class", "chart").attr("width", chart_conf.width).attr("height", (chart_conf.height + chart_conf.b));

        svg.append("g").selectAll('.bar').data(data)
            .enter().append("rect")
            .attr("style", "fill:steelblue")
            .attr("x", function(d){return xs(d.refex)})
            .attr("width",  xs.bandwidth())
            .attr("y", function (d) {return ys(d.exp_val)})
            .attr("height", function(d){return chart_conf.height - ys(d.exp_val)})
            .attr("transform", "translate("+ chart_conf.l +","+ chart_conf.margin +")");

        svg.append("g").append("text").attr('id', c.gid).attr('class', 'chart').text("summary").attr("transform", "translate(0, 12)");

        // axis
        svg.append("g").attr("class", "x axis").attr("transform", "translate("+ chart_conf.l +","+ (chart_conf.height + chart_conf.margin) +")")
            .call(xAxis);

        svg.append("g").attr("class", "y axis").attr("transform", "translate("+ chart_conf.l +", "+ chart_conf.margin +")").call(yAxis).append("text");

    }

    //選択した遺伝子の情報を選択リストg_infsに追加
    function add_to_list(d){
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

    // "Learn more" button
    function show_learnmore_btn() {
        d3.select("table.glist th.more").append("div")
            .attr("class", "learnmore")
            .html(`<button id="lm" type="button" class="btn btn-primary btn-xs">Learn more  <span class="glyphicon glyphicon-stats"></span></button>`)
            .on("click", function(){learn_more(selected_ids())})
    }

    // listに加えられた遺伝子のid:arrayを
    function selected_ids(){
        //現在のlist中にあるgene_idを返す
        var g = g_infs.map(function(g){return g.gid});
        return g
    }

    /*
    * 詳細チャート
     */
    function learn_more(gids){
        //r_infsを、引数として受け取る選択された遺伝子のidリストでフィルターし、描画用の配列を生成する。
        // 配列はチャート生成関数に渡す。
        s_r_infs = [];
        gids.map(function(k){return r_infs[k]}).forEach(function(d){
            //s_r_infs.push(obj2d(d)) //gidを引数に含める必要があるのでオブジェクトに
            s_r_infs.push({info: d[0], val: obj2d(d)})
        });
        bbchart.chart(s_r_infs);
    }

    //d3.js用のデータに整形し返す。
    function obj2d(e){
        //exp_val => d.value, sample => d.sampleにハッシュの値をmapし、ハッシュを返す。
        var i = e[1].map(function (d) {
            return  {"value": d3.format(".3f")(+d['exp_val']), "sample": d.sample, "cat": d.cat, "refex": d.refex}
        });
        return i
    }

    // draw focus chart and context
    var bbchart = {
        types: {},
        config: {},
        //config: function(d){ return d == 1 ? 'isSingle' : 'isGrouped'}, // data.length
        chart: function (data) {
            type = this.config[data.length === 1 ? 1: 2];
            this.types[type].chart(data);
        }
    };

    //typeと処理対象の設定
    bbchart.config = {
        1: 'isSingle',
        2: 'isGrouped'
    };

    bbchart.types.isSingle = {
        chart: function (data) {
            show_chart_view();
            reset_chart();
            var input_data = data[0]['val'];
            var n = input_data.map(function (d) {
                return d.refex
            });

            xa.domain(n);

            yb.domain([0, d3.max(input_data, function (d) {
                return d.value
            })]);
            xc.domain(n);
            yc.domain(yb.domain());

            // カテゴリごとfill colorを色分けするスケール
            colors.domain(d3.map(input_data, function (d) {
                return d.cat
            }).keys());

            xAxisc.tickSize(0).tickValues('');

            //svg.append('rect').attr('class', 'zoom').attr('width', bcnf.width).attr('height', bcnf.height)
            //.attr('transform', 'translate('+ bcnf.l + ',' + bcnf.t + ')')
            //.call(zoom);

            //exp.attr('clip-path', 'url(#clip)');
            focus.selectAll('.f_bar')
                .data(input_data)
                .enter().append('rect')
                .attr('class', 'f_bar')
                .style('fill', function (d) {
                    return colors(d.cat)
                })
                .attr('x', function (d) {
                    return xa(d.refex)
                })
                .attr('width', xa.bandwidth())
                .attr('y', function (d) {
                    return yb(d.value)
                })
                .attr('height', function (d) {
                    return bcnf.height - yb(d.value)
                })
                .on("mouseover", function (d) {
                    show_info(d.sample, d.refex, d.value)
                })
                .on("click", function (d, i) {
                    get_sample_ref(d.sample)
                });
            focus.append('g').attr('class', 'x-axis axis').attr('transform', 'translate(0,' + bcnf.height + ')').call(xAxisb);
            focus.append('g').attr('class', 'y-axis axis').call(yAxisb);

            context.append('g').selectAll('.c_bar').data(input_data)
                .enter().append('rect')
                .attr('class', 'c_bar')
                .attr('style', 'fill:#999999')
                .attr('x', function (d) {
                    return xc(d.refex)
                })
                .attr('width', xc.bandwidth())
                .attr('y', function (d) {
                    return yc(d.value)
                })
                .attr('height', function (d) {
                    return ccnf.h - yc(d.value)
                });

            context.append('g').attr('class', 'x axis').attr('transform', 'translate(0,' + ccnf.h + ')')
                .call(xAxisc);

            context.append('g').attr('class', 'brush')
                .call(brush)
                .call(brush.move, xc.range());

            show_gene_info(data[0]['info'])
        }
    };

    bbchart.types.isGrouped = {
        chart: function (data) {
            // 引数のデータがmultidataか否かで処理を分岐を分岐
            var input_data = data.length === 1 ? data[0] : data[0];
            //

            show_chart_view();
            reset_chart();

            var n = input_data.map(function (d) {
                return d.refex
            });
            xb.domain(n);
            yb.domain([0, d3.max(input_data, function (d) {
                return d.value
            })]);
            xc.domain(xb.domain());
            yc.domain(yb.domain());

            // カテゴリごとfill colorを色分けするスケール
            colors.domain(d3.map(s_r_infs, function (d) {
                return d.cat
            }).keys());

            xAxisc.tickSize(2).tickValues(xc.domain().filter(function (d, i) {
                return (i % 20) == 0
            })).tickFormat(function (d) {
                return d.slice(-4)
            });

            //svg.append('rect').attr('class', 'zoom').attr('width', bcnf.width).attr('height', bcnf.height)
            //.attr('transform', 'translate('+ bcnf.l + ',' + bcnf.t + ')')
            //.call(zoom);

            //exp.attr('clip-path', 'url(#clip)');
            focus.selectAll('.bar')
                .data(input_data)
                .enter().append('rect')
                .attr('class', 'bar')
                .style('fill', function (d) {
                    return colors(d.cat)
                })
                .attr('x', function (d) {
                    return xb(d.sample)
                })
                .attr('width', xb.bandwidth())
                .attr('y', function (d) {
                    return yb(d.value)
                })
                .attr('height', function (d) {
                    return bcnf.height - yb(d.value)
                })
                .on("mouseover", function (d) {
                    show_info(d.sample, d.refex,  d.value)
                })
                .on("click", function (d, i) {
                    get_sample_ref(d.sample)
                });
            focus.append('g').attr('class', 'x-axis axis').attr('transform', 'translate(0,' + bcnf.height + ')').call(xAxisb);
            focus.append('g').attr('class', 'y-axis axis').call(yAxisb);

            context.append('g').selectAll('.bar').data(input_data)
                .enter().append('rect')
                .attr('style', 'fill:#999999')
                .attr('x', function (d) {
                    return xc(d.sample)
                })
                .attr('width', xc.bandwidth())
                .attr('y', function (d) {
                    return yc(d.value)
                })
                .attr('height', function (d) {
                    return ccnf.h - yc(d.value)
                });

            context.append('g').attr('class', 'x axis').attr('transform', 'translate(0,' + ccnf.h + ')')
                .call(xAxisc).selectAll('text').style("text-anchor", "end").attr("dx", "-.5em").attr("dy", "0.1em").attr("transform", "rotate(-90)");


            context.append('g').attr('class', 'brush')
                .call(brush)
                .call(brush.move, xc.range());
        }
    };

    function brushed() {

        if (d3.event.sourceEvent && d3.event.sourceEvent.type === "brush") return;
        //brunsh eventで選択された値かデフォルト値をsに
        var s = d3.event.selection || xa.range();
        console.log(s);
        console.log(xa.range());
        console.log(xa.domain().length);

        test_log(focus.sorted);

        //xsまたはxsをフィルターし、選択したレンジのドメイン生成
        var x = focus.sorted ? xs: xa;
        console.log(xs.domain().length);
        console.log(xa.domain().length);
        console.log(xd.domain().length);
        console.log(xd.domain().slice(-2)); //sortされた場合はxs

        selected = x.domain()
            .filter(function (d, i) {
                return s[0] <= (a = (i + 1) * xd.bandwidth()) && (a <= s[1])
                //range最小値とwidth*(i+1)を比較し最小値以上かつrange最大値とwidth*(i+2)を比較しrange最大値より小さい
            });
        xc.domain(selected);
        console.log(selected.length);
        console.log(selected.slice(-2));//filterdなdomain

        focus.select(".x-axis").call(xAxisb);
        focus.selectAll(".f_bar")
        .attr('x', function(d){return xc(d.refex)})
        .attr('width', xc.bandwidth())
        .attr('y', function(d){return yb(d.value)})
        .attr('height', function(d){return bcnf.height - yb(d.value)})
        .on("mouseover", function(d){show_info(d.sample, d.refex,  d.value)})
        .on("click", function(d){get_sample_ref(d.sample)});

    }

    function zoomed() {}

    function sort_bars(){
        context.selectAll('.axis').remove();
        context.selectAll('.brush').remove();

        // 引数のデータがmultidataか否かで処理を分岐を分岐
        var data =  s_r_infs[0]['val'];

        // input_data.valueの値で連想配列をソートする
        var data_sorted = data.sort(function(a, b){return +b.value - +a.value}); //descendingにソートされる。
        var samples_sorted = data_sorted.map(function(d){return d.refex});

        u_data = Array.from(new Set(samples_sorted));
        test_log(data_sorted)
        var c = samples_sorted.filter(function (x, i, self) {
            return self.indexOf(x) !== self.lastIndexOf(x);
        });

        // sort表示のX軸scaleの設定
        xs.domain(samples_sorted);

        focus.selectAll('.f_bar').transition().duration(500)
            .attr('x', function(d){return xs(d.refex);})
            .attr('width', xs.bandwidth())
            .attr('y', function(d){return yb(d.value);})
            .attr('height', function(d){return bcnf.height - yb(d.value)})
            .style('fill', function(d,i){return colors(d.cat)});

        focus.sorted = true;

        context.selectAll('.c_bar').transition().duration(500)
            .attr('x', function(d){return xs(d.refex)})
            .attr('width', xc.bandwidth())
            .attr('y', function(d){return yc(d.value)})
            .attr('height', function (d) {return ccnf.h - yc(d.value)});


        context.append('g').attr('class', 'x axis').attr('transform', 'translate(0,' + ccnf.h + ')')
                .call(xAxiss).selectAll('text').style("text-anchor", "end").attr("dx", "-.5em").attr("dy", "0.1em").attr("transform", "rotate(-90)");

        context.append('g').attr('class', 'brush')
            .call(brush)
            .call(brush.move, xc.range());

        //chart_state.sorted = true;
        //chart_state.multichart = false;
    }

    function show_gene_info(inf){
        d3.select("#barchart .gene_info").html("<h3>Target:</h3> " + inf['symbol']);
    }

    function show_reference(item){
        if($('#barchart .sample_ref div.ref').length){d3.select('#barchart .sample_ref .ref').remove();}
        var ref = d3.select('#barchart .sample_ref').append('div').attr('class', 'ref');
        test_log(item);
        ref.append('div').html("<h3>Cell ontology:</h3> " + ar2str(item.cell));
        ref.append('div').html("<h3>Fantom5:</h3> "+ ar2str(item.fantom));
        ref.append('div').html("<h3>Uberon anatomy ontology:</h3> "+ ar2str(item.uberon));
        ref.append('div').html("<h3>Human Disease ontology:</h3> "+  ar2str(item.disease));
        console.log(item);
    }

    function show_info(name, ref, val){
        d3.select("#barchart .sample_name").html("<h3>Sample:</h3> " + name);
        d3.select("#barchart .refex_id").html("<h3>RefEx:</h3> " + ref);
        d3.select("#barchart .exp_val").html("<h3>Expression value:</h3> " + val);
    }

    function ar2str(x){
        return  x.join(', ');
    }

    /*
     * UIイベント定義
     */
    var th = $('#refex .typehead').typeahead(null, {
        name: 'gene_info',
        limit:10,
        display: 'value',
        source: gene_info_human.ttAdapter()
    });

    // typehead('destroy')して、sourceにbloodhound objを指定し再定義
    function change_source(g){
        var target = eval('gene_info_'+ g);
        th.typeahead('destroy');
        th.typeahead(null, {
            name: 'gine_info',
            limit: 15,
            display: 'value',
            source: target.ttAdapter()})
    }

    // 詳細チャート描画エリアを確保（）bar,axisを初期化する
    function show_chart_view(){
        svgransition().duration(100).attr('height', bcnf.height + bcnf.b + bcnf.t + ccnf.h + ccnf.b);
    }

    // bar, axis, brushを削除する
    function reset_chart(){
        focus.selectAll('.f_bar').remove();
        context.selectAll('.bar').remove();
        focus.selectAll('.axis').remove();
        context.selectAll('.c_bar').remove();
        context.selectAll('.axis').remove();
        context.selectAll('.brush').remove();
        focus.sorted = false;
    }

    function test_log(d){
        console.log(d);
    }

    // radio buttonのイベント
    $('input').on('ifChecked', function (e) {
        change_source(this.value)
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

    $("#sort_bbchart").click(function(){
        sort_bars()
    })


})();
// biobarchart.js
// ver 0.4.5
//

$("button").button();
var bbchart = (function(gene_id){
    var gene_id;
    var base_url = 'http://localhost:8080/';
    var gene_ids = "./js/mouse_gene_id.csv";
    var gene_id_0 = gene_id,
        gene_id_1,
        views = {width: 900, height:300, brush_height:50},
        margin = {top: 30, right: 20, bottom: 65, left: 30},
        margin2 = {top: 20},
        width =  views.width - margin.left -margin.right,
        height = views.height - margin.top - margin.bottom,
        height2 = views.brush_height,
    //データ全長を表示するcontextのスケール
        x = d3.scale.ordinal().rangeBands([0, width]),
        y = d3.scale.linear().range([height2, 0]),
    //ソートしたデータのスケール
        x0 = d3.scale.ordinal(),
    //focusのスケール
        f_x = d3.scale.ordinal().rangeBands([0, width]),
        f_y = d3.scale.linear().range([height, 0]),
        kv_map = d3.scale.ordinal(),
        colors = d3.scale.ordinal().range(["SteelBlue","DarkMagenta", "Orange", "Olive", "Navy"]),
        c = d3.scale.ordinal().range(["SlateGray","Silver", "RosyBrown", "Tan" ]),
    // Grouped charのためのスケール.g_x1はグループ内のrectの相対座標を返すスケール。g_x0はg.study要素のチャート全体の座標
        g_x0 = d3.scale.ordinal().rangeBands([0, width]),
        g_x1 = d3.scale.ordinal(),
        g_y = d3.scale.linear().range([height, 0]),
    // 描画領域のスケール.領域選択時にはx座標の倍率が返る（狭い領域を選択するほど拡大率は高くなる）
        g_xzoom = d3.scale.linear().range([0, width]).domain([0, width]),
        sort_button = d3.select("#sort_samples"),
        sort_data = document.getElementById("sort_data");



    var brush = d3.svg.brush()
        .x(x)
        .on("brush", function(){brushed()});

    var brush_s = d3.svg.brush()
        .x(x0)
        .on("brush", function(){brushed()});

    var legend = d3.legend.color().scale(c);

    var xAxis = d3.svg.axis()
        .scale(f_x)
        .orient("bottom");

    var yAxis = d3.svg.axis()
        .scale(f_y)
        .orient("left")
        .ticks(3);

    var svg = d3.select("#chart").append("svg")
        .attr("width", views.width).attr("height", views.height + margin.bottom)
        .append("g")
        .attr("transform", "translate("+ margin.left + "," + margin.top + ")");

    var focus = svg.append("svg")
        .attr("width", width)
        .attr("class", "focus");

    var grouped = svg.append("svg")
        .attr("width", width)
        .attr("class", "grouped");

    var context = svg.append("g")
        .attr("class", "context")
        .attr("transform", "translate(0," + (height + margin2.top) + ")");

    var g_ids = d3.select("#gene_ids");
    var g_id_0 = d3.select("#gene_id");
    g_id_0.append("i").attr("class", "fa fa-stop").style("color", colors(0)).text(gene_id);
    /*
    d3.select("#read_sample")
        .on("change", function(){
            change_views();
        });
     */

    d3.select("#app").attr("width", Number(views.width) + 300);

    get_initial_data();

    function get_initial_data(){
        target = base_url + gene_id;

        //d3.json(target_url, function(error,d){
        d3.json(target, function(d){
            //if(error) return console.warn(error);
            input_data = d;
            //d3.json(endpoint + "?query=" +q, function(data){
            if (input_data.length == 0) {
                $("#gene_id_input").attr("placeholder", "input other id")
                    .val("");
            } else {
                chart(input_data);
            }
        });

    }

    d3.text(gene_ids, function(error,text){
        //gene_idリストの読み込み
        var data = d3.csv.parseRows(text);
        //gene_id_inputに入力がある場合、auto_completeの後add_dataする
        $("#gene_id_input").autocomplete({
            source: data[0],
            minLength: 2,
            select: function(e, ui){
                if(ui.item){ gene_id_1 = ui.item.value;};
                g_ids.append("div").attr("class", "refex_info_apx")
                    .append("i").attr("class", "fa fa-stop").style("color", colors(1)).text(gene_id_1);
                add_data(gene_id_1)
            }
        });
    });

    $("#gene_id_input").blur(function(){
        if(this.value == ""){
            g_ids.select(".refex_info_apx").remove();
            change_chart_states()
        }
    });

    // input formにgene_idが追加されたら
    function add_data(gene_id){
        target = base_url + gene_id;
        d3.json(target,function(error, data){
            console.log(data)
            input_data_2 = data;
            if(data.length == 0){
                $("#gene_id_input").attr("placeholder", "input other id")
                    .val("");
            }else{
                console.log(input_data_2)
                multi_chart(input_data, input_data_2);

            }
        });
    }

    var chart_state = {
        sorted : false,
        multichart: false
    };

    function  change_sort_states(data){
        d3.selectAll(".brush").select(".extent").attr("width", 0);
        if(chart_state.sorted == false && chart_state.multichart == false){
            sort_bars(input_data);
            sort_context(input_data);
            context.selectAll(".brush").remove();
            context.append("g")
                .attr("class", "x brush")
                .call(brush)
                .selectAll("rect")
                .attr("y", -6)
                .attr("height", height2 + 7);
        }else if(chart_state.sorted == true && chart_state.multichart == false){
            x0 = d3.scale.ordinal().rangeBands([0, width]).domain(names);
            context.selectAll(".brush").remove();
            //処理・関数化する方が良い
            focus.selectAll("rect").transition().duration(300)
                .attr("x", function(d){return x0(d.name);})
                .attr("width", x0.rangeBand())
                .attr("y", function(d){return f_y(d.value);})
                .attr("height", function(d){return height - f_y(d.value)})
                .attr("fill", function(d,i){return colors(i)});

            context.selectAll("rect").transition().duration(300)
                .attr("x", function(d){return x0(d.name)})
                .attr("width", x0.rangeBand())
                .attr("y", function(d){return y(d.value)})
                .attr("height", function(d){return height2 - y(d.value)});

            context.append("g")
                .attr("class", "x brush")
                .call(brush)
                .selectAll("rect")
                .attr("y", -6)
                .attr("height", height2 + 7);

            chart_state.sorted = false;
            chart_state.multichart = false;

        }else if(chart_state.multichart == true && chart_state.sorted == false){
            sort_grouped_bars(data);
            sort_button.text("Clear sort");
            chart_state.sorted = true;
            context.selectAll(".brush").remove();
            context.append("g")
                .attr("class", "x brush")
                .call(brush)
                .selectAll("rect")
                .attr("y", -6)
                .attr("height", height2 + 7);

        }else if(chart_state.multichart == true && chart_state.sorted == true){
            sort_button.text("sort samples");
            context.selectAll(".brush").remove();

            g_x0.rangeBands([0, width]);
            g_x1.rangeBands([0, g_x0.rangeBand()]);

            grouped.selectAll(".study")
                .attr("transform", function(d, i){
                    return "translate(" + g_x0(d[0].name) + ",0)";
                });
            grouped.selectAll(".study").selectAll("rect")
                .attr("width", g_x1.rangeBand())
                .attr("x", function(d, i){return g_x1(i)});

            context.selectAll("rect").transition().duration(300)
                .attr("x", function(d){return x(d.name)})
                .attr("width", x.rangeBand())
                .attr("y", function(d){return y(d.value)})
                .attr("height", function(d){return height2 - y(d.value)});

            context.append("g")
                .attr("class", "x brush")
                .call(brush)
                .selectAll("rect")
                .attr("y", -6)
                .attr("height", height2 + 7);

            chart_state.sorted = false;
        }
    }
    function change_chart_states(){
        if(chart_state.multichart == true) {
            context.selectAll(".bar").remove();
            d3.select(this).text("Clear sort");
            grouped.selectAll(".study").remove();
            //svg.select(".context").selectAll(".bar").remove();
            q = get_sparql(gene_id_0);
            q = encodeURIComponent(q)
            get_initial_data(q);
        }
    }

    function chart(input_data) {
        input_data.forEach(function (d) {
            d.value = +d["expression_value"];
            d.name = d["sample"];
        });

        var categories = input_data.map(function(d){
            return d.sample_category.value
        });
        categories = Array.from(new Set(categories));
        c.domain(categories);

        names = input_data.map(function (d) {
            return d.name
        });
        var values = input_data.map(function (d) {
            return +d.value
        });
        //ドメインにd.names, d.valuesの配列を渡す
        x.domain(names);
        y.domain([0, d3.max(values)]);
        //focused chartの初期ドメインを設定する
        f_x.domain(x.domain());
        f_y.domain(y.domain());
        //サンプル名を仮引数にしてvalueに変換するスケール
        //d.names, d.valueの初期値を保時する
        kv_map.domain(names)
            .range(values);

        sort_button.on("click", function () {
            d3.select(this).text("Clear sort");
            change_sort_states(input_data);
        });

        var legendview = svg.append("g")
            .attr("class", "legend")
            .attr("transform", "translate(0,"+  (Number(height) + Number(height2) + 24)  + ")");

        legendview.call(legend);
        draw_axis(input_data);
        draw_focus(input_data);
    }

    function draw_focus(input_data){
        focus.selectAll("rect").data(input_data, function(d){return d.name})
            .enter().append("rect").attr("class", "rct");

        focus.selectAll("rect")
            .attr("x", function(d){return f_x(d.name);})
            .attr("width", x.rangeBand())
            .attr("y", function(d){return f_y(d.value);})
            .attr("height", function(d){return height - f_y(d.value)})
            .style("fill", function(){return colors(0)})
            .on("mouseover", function(d, i){show_tips(f_x.domain()[i], kv_map(f_x.domain()[i]))})
            .on("click", function(d, i){show_reference(d, i, input_data)});

        context.selectAll(".bar").data(input_data)
            .enter().append("g").attr("class", "bar");

        context.selectAll(".bar").append("rect")
            .attr("class", "rct")
            .attr("x", function(d){return x(d.name);})
            .attr("width", x.rangeBand())
            .attr("y", function(d){return y(d.value);})
            .attr("height", function(d){return height2 - y(d.value)})
            .style("fill", function(d){return c(d.sample_category.value)});

        context.append("g")
            .attr("class", "x brush")
            .call(brush)
            .selectAll("rect")
            .attr("y", -6)
            .attr("height", height2 + 7);

        var brushinfo = svg.append("svg")
            .attr("y", views.height - 96)
            .attr("width", views.width - margin.left)
            .attr("height", 20)
            .append("g");

        brushinfo.append("rect")
            .attr("width", width)
            .attr("height", 16)
            .style("fill", "#325c7e");

        brushinfo
            .append("text")
            .text("◀ select range ▶")
            .style("fill", "white")
            .attr("text-anchor", "middle")
            .attr("height", 30)
            .attr("font-size",10)
            .attr("transform","translate("+ Number(width)/2 +", 10)");

        chart_state.sorted = false;
        chart_state.multichart = false;
    }

    function brushed() {
        //Draw single row data
        if(chart_state.multichart == false) {
            //x.domainをbrush.extent()の範囲で再定義
            //brush.extent()は選択範囲をcontextのローカルな座標の[min, max]を返す

            //選択された範囲内のnames配列
            var selected = [];
            if(chart_state.sorted == false){
                var ext = brush.extent();
                //選択した座標でx.rangeBand()を返す
                selected = x.domain()
                    .filter(function (d, i) {
                        return ext[0] <= (a = (i + 1) * x.rangeBand()) && (a + x.rangeBand() <= ext[1])
                    });
                var x_ori = x.domain();
                f_x.domain(brush.empty() ? x_ori : selected);

                //ドメインは kv_mapでname->valueのマップ
                //高さなどのbarの値は、f_x.domain()に序数を渡し、kv_mapスケールでsampe=>value変換し、さらに表示用にf_yで変換する。
                //brushやsortした場合、DOMに全データがbindするのでは無く、スケールと序数で必用なデータを変換して取得する。
                focus.selectAll("rect")
                    .attr("width", function () {
                        return f_x.rangeBand()
                    })
                    .attr("x", function (d, i) {
                        return i * f_x.rangeBand();
                    })
                    .attr("y", function (d, i) {
                        return f_y(kv_map(f_x.domain()[i]))
                    })
                    .attr("height", function (d, i) {
                        return height - f_y(kv_map(f_x.domain()[i]))
                    });
            }else if(chart_state.sorted == true){
                var ext = brush_s.extent();
                selected = x0.domain()
                    .filter(function (d, i) {
                        return ext[0] <= (a = (i + 1) * x0.rangeBand()) && (a + x0.rangeBand() <= ext[1])
                    });
                x_ori = x0.domain();
                f_x.domain(x0.domain());
                f_x.domain(brush.empty() ? x_ori : selected);
                focus.selectAll("rect")
                    .attr("width", function () {
                        return f_x.rangeBand()
                    })
                    .attr("x", function (d, i) {
                        return i * f_x.rangeBand();
                    })
                    .attr("y", function (d, i) {
                        return f_y(kv_map(f_x.domain()[i]))
                    })
                    .attr("height", function (d, i) {
                        return height - f_y(kv_map(f_x.domain()[i]))
                    });
            }

        }else{
            //Draw multi rows data
            var ext = brush.extent();
            var g_range_ori = g_xzoom.range();
            // g_xzoomのドメインに選択範囲の座標を設定
            // g_xzoomは元のrangeと拡大したrangeの倍率を返すスケール
            g_xzoom.domain(brush.empty() ? g_range_ori : ext);

            // g_x0に拡大したrangeBandsをあたえる
            g_x0.rangeBands([g_xzoom(g_range_ori[0]), g_xzoom(g_range_ori[1])]);
            g_x1.rangeBands([0, g_x0.rangeBand()]);

            //再描画
            grouped.selectAll(".study")
                .attr("transform", function(d, i){
                    return "translate(" + g_x0(d[0].name) + ",0)";
                });
            //
            grouped.selectAll(".study").selectAll("rect")
                .attr("width", g_x1.rangeBand())
                .attr("x", function(d, i){return g_x1(i)});
        }
    }

    function draw_axis(){
        svg.append("g")
            .attr("class", "y axis ")
            .call(yAxis)
            .append("text")
            .attr("y", 6);
    }

    function sort_bars(data){
        // input_data.valueの値で連想配列をソートする
        var refex_sorted = data.sort(function(a, b){return +b.value - +a.value}); //descendingにソートされる。
        samples_sorted = refex_sorted.map(function(d){return d.name});

        x0.rangeBands([0, width]).domain(samples_sorted);

        focus.selectAll("rect").transition().duration(700)
            .attr("x", function(d){return x0(d.name);})
            .attr("width", x0.rangeBand())
            .attr("y", function(d){return f_y(d.value);})
            .attr("height", function(d){return height - f_y(d.value)})
            .attr("fill", function(d,i){return colors(i)});

        chart_state.sorted = true;
        chart_state.multichart = false;

        sort_button.on("click", function () {
            d3.select(this).text("sort samples");
            change_sort_states(input_data);
        });
    }

    function multi_chart(input_data, apx_data){
        //データセットのvalueを元のデータセットに追加
        var study1 = input_data.map(function(d){
            var value = +d["expression_value"];
            var name = d["sample"];
            var refex = d["refex"];
            return {name: name, value: value, refex:refex};
        });

        var study2 = apx_data.map(function(d){
            var value = +d["expression_value"];
            var name = d["sample"];
            return {name: name, value: value};
        });

        //グループを構成するデータセットの要素配列。本来は動的なハッシュ。
        var key1 = gene_id_0;
        var key2 = gene_id_1;
        var study_names = [{key1 : "0"},{ key2 : "1"}];
        //２つのデータのハッシュを{name:"":,value: }をマップした配列を作る

        var data = d3.zip(study1, study2);
        // [{name: "", value: num}, {name: "", value: num}]のようにstudy_nameの要素ごとにハッシュを生成する
        data.forEach(function(d){
            d.studies = study_names.map(function(name, i) {return {sample: d[i]["name"], value: d[i]["value"], refex: d[0]["refex"]}});
            d.va = d3.variance([d[0].value, d[1].value]);
        });
        //
        g_x0.domain(data.map(function(d){
            return d[0].name;
        }));
        //読み込んだデータセットの数をg_x1.domainに渡す。
        var study_num = [];
        for (var i = 0; i < study_names.length; i++){study_num[i] = i;}
        g_x1.domain(study_num).rangeRoundBands([0, g_x0.rangeBand()]);
        g_y.domain([0, d3.max(data, function(d){return d3.max(d.studies, function(d){return d.value;})})]);
        svg.select(".focus").selectAll("rect").remove();

        //g.studyを生成。g.studyには有るサンプルのデータセット分の値がbindされる
        grouped.selectAll(".study")
            .data(data)
            .enter().append("g")
            .attr("class", "study")
            .attr("transform", function(d){return "translate(" + g_x0(d[0].name) + ", 0)"});

        //g.study
        grouped.selectAll(".study").selectAll("rect")
            .data(function(d){return d.studies})
            .enter().append("rect")
            .attr("width", g_x1.rangeBand())
            .attr("x", function(d,i){return g_x1(i)}) //study_nameを渡す必用がある。
            .attr("y", function(d){return g_y(d.value)})
            .attr("height", function(d){return  height - g_y(d.value);})
            .style("fill", function (d,i){return colors(i)})
            .on("mouseover", function(d, i){show_tips(d.sample, d.value)})
            .on("click", function(d){show_multichar_ref(d)});

        chart_state.multichart = true;
        chart_state.sorted = false;

        sort_button.on("click", function () {
            change_sort_states(data);
        });
    }

    function sort_grouped_bars(data){
        var g_sorted = data.sort(function(a, b){return b.va - a.va});
        var g_x0 = d3.scale.ordinal()
            .domain(g_sorted.map(function(d){return d[0].name;}))
            .rangeBands([0, width]);
        svg.select(".grouped").selectAll("g").remove();
        grouped.selectAll(".study")
            .data(g_sorted)
            .enter().append("g")
            .attr("class", "study")
            .attr("transform", function(d){return "translate(" + g_x0(d[0].name) + ", 0)"});
        grouped.selectAll(".study").selectAll("rect")
            .data(function(d){return d.studies})
            .enter().append("rect")
            .attr("width", g_x1.rangeBand())
            .attr("x", function(d,i){return g_x1(i)}) //study_nameを渡す必用がある。
            .attr("y", function(d){return g_y(d.value)})
            .attr("height", function(d){return  height - g_y(d.value);})
            .style("fill", function (d,i){return colors(i)})
            .on("mouseover", function(d, i){show_tips(d.sample, d.value)})
            .on("click", function(d){show_multichar_ref(d)});

        sort_context_valiance(g_sorted);

        chart_state.sorted = true;
        chart_state.multichart = true;
    }

    function sort_context(data){
        var context_sorted = data.sort(function(a, b){return b.value - a.value});
        samples_sorted = context_sorted.map(function(d){return d.name});
        var x0 = d3.scale.ordinal().rangeBands([0, width]).domain(samples_sorted);
        context.selectAll("rect").transition().duration(500)
            .attr("x", function(d){return x0(d.name)})
            .attr("width", x0.rangeBand())
            .attr("y", function(d){return y(d.value)})
            .attr("height", function(d){return height2 - y(d.value)});
    }
    function sort_context_valiance(data){
        var group_sorted = data.map(function(d){return d[0].name});
        var x0 = d3.scale.ordinal().rangeBands([0, width]).domain(group_sorted);
        context.selectAll("rect").transition().duration(500)
            .attr("x", function(d){return x0(d.name)})
            .attr("width", x0.rangeBand())
            .attr("y", function(d){return y(d.value)})
            .attr("height", function(d){return height2 - y(d.value)});
        context.selectAll(".brush").remove();
        context.append("g")
            .attr("class", "x brush")
            .call(brush)
            .attr("y", -6)
            .attr("height", height2 + 7);
    }

    function show_multichar_ref(d){
        window.open(d.refex, "_blank")
    }

    function show_reference(d, i, input_data){
        var sample_name = f_x.domain()[i];
        var reference_url = input_data.filter(function(item, index){
            if (item.name == sample_name) return true;
        });
        window.open(reference_url[0].sample.value, '_blank');
    }

    function show_tips(sample_name, sample_value){
        d3.select("#exp_val").html(sample_value);
        d3.select("#sample_id").html(sample_name);
    }

});

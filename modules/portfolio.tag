<portfolio>
    <div class="container panel" show={ display }>
        <div id="gene_list_view">

                <label>{ title }</label>
                <button id="show_chart" type="button" class="btn-primary btn-sm" onclick={show_chart}>Comparison</button>

                <table class="table glist">
                    <thead>
                    <tr>
                        <th></th>
                        <th>GeneSymbol</th>
                        <th>GeneName</th>
                        <th>Alias</th>
                        <th>NCBI GeneID</th>
                        <th>Annotation</th>
                        <th> Gene expression patterns</th>
                    </tr>
                    </thead>
                    <tbody>
                        <form name="g_lists">
                        <tr each={list}>
                            <td width="4px"><input type="checkbox" name="g_list" class="form-check-input" value="{entrezgene}"></td>
                            <td onclick={selected_id}>{symbol}</td>
                            <td onclick={selected_id}>{name}</td>
                            <td onclick={selected_id}>{alias.replace(/\[|\]|null/g, '')}</td>
                            <td onclick={selected_id}>{entrezgene}</td>
                            <td><i class="fas fa-info-circle btn show_gene_info" onclick={show_gene_info}></i></td>
                            <td><img src="http://refex2.bmu.jp/images/summary/refex_summary_{entrezgene}.png"></td>
                        </tr>
                        </form>

                    </tbody>

                </table>

        </div>

    </div>

    <script>
        var self = this;
        var mygene_fields = "name,alias,summary,symbol,refseq,unigene,taxid,type_of_gene,go,ensembl,entrezgene";
        this.title = 'Matching Genes';
        //
        self.display = false;
        obs.on("listUpdated", function (obj) {
            self.list = obj;
            self.display = true;
            self.update()
        });

        obs.on("projectSelected", function (obj) {
            // 本来選択可能なprojectとorganismをコンポーネントで取得する
            self.project = obj.project;
            self.organism = obj.organism;
        });

        // chartページを開く
        selected_id(e)
        {
            var request_id = e.item.entrezgene;
            //window.open("chart.html?gid=" + request_id, target="_blank", rel="noopener")
            window.open("gene/chart.html?gid=" + request_id + "&project=" + self.project + "&organism=" + self.organism)
        }

        show_gene_info(e)
        {
            var gid = e.item.entrezgene;
            fetch("https://mygene.info/v3/gene/" + gid + "?fields=" + mygene_fields)
                .then(function (res) {
                    return res.json()
                })
                .then(function (jsn) {
                    obs.trigger("showmygene", jsn)

                });

            $('#geneinfo').modal();
        }

        show_chart()
        {
            var id_str = ""
            $('input:checkbox[name="g_list"]:checked').each(function () {
                id_str = id_str + ',' + $(this).val()
            })
            id_str = id_str.slice(1,);
            window.open("gene/chart.html?gid=" + id_str + "&project=" + self.project + "&organism=" + self.organism)
        }

    </script>
</portfolio>